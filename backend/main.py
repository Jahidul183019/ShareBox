"""
ShareBox backend — FastAPI server for ephemeral room-based sharing.

Architecture:
    - Rooms live in memory, keyed by 6-char codes. A background task evicts
      rooms that have been inactive for ROOM_TTL_SECONDS and deletes their files.
    - REST endpoints handle room creation, history, and file uploads.
    - WebSocket at /ws/{code}/{user_id} handles real-time message fan-out.
    - The compiled React SPA in ./static is served as a catch-all so the whole
      app runs from one process.
"""
from __future__ import annotations

import asyncio
import logging
import os
import random
import socket
import string
import urllib.error
import urllib.request
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger("sharebox")

from fastapi import (
    FastAPI,
    File,
    HTTPException,
    Request,
    Response,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent.resolve()
UPLOADS_DIR = BASE_DIR / "uploads"
STATIC_DIR = BASE_DIR / "static"
UPLOADS_DIR.mkdir(exist_ok=True)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB per upload
ROOM_TTL_SECONDS = 24 * 60 * 60   # evict rooms inactive for 24h
CLEANUP_INTERVAL = 60 * 60        # run cleanup every hour
MAX_MESSAGES_PER_ROOM = 2000      # ring buffer to prevent memory growth

ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp",
}
ALLOWED_VIDEO_TYPES = {
    "video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-matroska",
}

# Alphabet excludes visually confusing characters (0/O, 1/I)
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 6


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Room state
# ---------------------------------------------------------------------------
class Room:
    """A single shared room. Holds message history, live WS connections, files."""

    def __init__(self, code: str):
        self.code = code
        self.messages: List[dict] = []
        self.connections: Dict[str, WebSocket] = {}
        self.files: List[str] = []  # basenames of uploaded files, for cleanup
        self.created_at = datetime.now(timezone.utc)
        self.last_activity = self.created_at

    def touch(self) -> None:
        self.last_activity = datetime.now(timezone.utc)

    def add_message(self, message: dict) -> None:
        self.messages.append(message)
        # Keep the most recent N messages to bound memory usage
        if len(self.messages) > MAX_MESSAGES_PER_ROOM:
            overflow = len(self.messages) - MAX_MESSAGES_PER_ROOM
            self.messages = self.messages[overflow:]
        self.touch()

    async def broadcast(self, payload: dict, exclude: Optional[str] = None) -> None:
        """Send a JSON payload to every connected client. Drops dead sockets."""
        dead: List[str] = []
        for uid, ws in list(self.connections.items()):
            if uid == exclude:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.connections.pop(uid, None)

    def find_message(self, message_id: str) -> Optional[dict]:
        for message in reversed(self.messages):
            if message.get("id") == message_id:
                return message
        return None

    def remove_message(self, message_id: str) -> Optional[dict]:
        for idx in range(len(self.messages) - 1, -1, -1):
            if self.messages[idx].get("id") == message_id:
                return self.messages.pop(idx)
        return None

    def visible_messages_for(self, user_id: str) -> List[dict]:
        visible: List[dict] = []
        for message in self.messages:
            deleted_for = message.get("deleted_for")
            if isinstance(deleted_for, list) and user_id in deleted_for:
                continue
            visible.append(message)
        return visible


def message_preview(message: dict) -> str:
    msg_type = message.get("type")
    if msg_type in ("text", "code"):
        content = (message.get("content") or "").strip()
        if not content:
            return ""
        return content[:120]
    if msg_type == "image":
        return "[Image]"
    if msg_type == "video":
        return "[Video]"
    if msg_type == "file":
        return f"[File] {(message.get('filename') or '').strip()}".strip()
    return "[Message]"


rooms: Dict[str, Room] = {}


def generate_room_code() -> str:
    """Generate a room code that isn't currently in use."""
    for _ in range(50):
        code = "".join(random.choices(CODE_ALPHABET, k=CODE_LENGTH))
        if code not in rooms:
            return code
    # Extremely unlikely fallback — expand length if space is somehow saturated
    return "".join(random.choices(CODE_ALPHABET, k=CODE_LENGTH + 2))


# ---------------------------------------------------------------------------
# Background cleanup
# ---------------------------------------------------------------------------
async def cleanup_rooms_loop() -> None:
    """Periodically evict rooms that have been quiet for ROOM_TTL_SECONDS."""
    while True:
        try:
            await asyncio.sleep(CLEANUP_INTERVAL)
            now = datetime.now(timezone.utc)
            stale = []
            for code, room in rooms.items():
                idle = (now - room.last_activity).total_seconds()
                if idle > ROOM_TTL_SECONDS and not room.connections:
                    stale.append(code)
            for code in stale:
                room = rooms.pop(code, None)
                if not room:
                    continue
                for filename in room.files:
                    try:
                        (UPLOADS_DIR / filename).unlink(missing_ok=True)
                    except Exception:
                        pass
        except asyncio.CancelledError:
            raise
        except Exception:
            # Never let the cleanup task die silently — back off briefly on error
            await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(cleanup_rooms_loop())
    keepalive_task = asyncio.create_task(keepalive_loop())
    try:
        yield
    finally:
        task.cancel()
        keepalive_task.cancel()
        for t in (task, keepalive_task):
            try:
                await t
            except asyncio.CancelledError:
                pass
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Keep-alive
# ---------------------------------------------------------------------------
# Render's free tier spins down a web service after ~15 minutes of zero inbound
# traffic. UptimeRobot alone is not enough to keep it warm, because the very
# first ping after sleep takes 30+ seconds and UptimeRobot counts that as DOWN.
#
# The keep-alive task below self-pings our own /api/health every
# KEEPALIVE_INTERVAL seconds so the service never idles out. It only runs in
# hosted environments (where RENDER_EXTERNAL_URL is set); on a developer laptop
# the ping is skipped entirely.
KEEPALIVE_INTERVAL = 14 * 60  # 14 minutes, safely under Render's 15-minute idle
KEEPALIVE_TIMEOUT = 10        # seconds for the self-ping request


async def keepalive_loop() -> None:
    """Periodically self-ping /api/health so Render free tier never sleeps."""
    target = (os.getenv("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")
    if not target:
        # Local dev — nothing to ping.
        return

    url = f"{target}/api/health"
    # Small startup delay so we don't race the HTTP server coming online.
    await asyncio.sleep(5)

    while True:
        try:
            await asyncio.sleep(KEEPALIVE_INTERVAL)
            await asyncio.to_thread(_ping_keepalive, url)
            logger.info("keep-alive ping ok: %s", url)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning("keep-alive ping failed: %s", exc)
            # Loop continues; the next tick will retry.


def _ping_keepalive(url: str) -> None:
    """Synchronous self-ping used by keepalive_loop (runs in a worker thread)."""
    req = urllib.request.Request(url, headers={"User-Agent": "sharebox-keepalive/1.0"})
    with urllib.request.urlopen(req, timeout=KEEPALIVE_TIMEOUT) as resp:
        if resp.status >= 400:
            raise RuntimeError(f"keep-alive got HTTP {resp.status}")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="ShareBox", lifespan=lifespan)

# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------
# /api/rooms can be hammered by a single IP to fill memory with empty rooms
# before the 24-hour cleanup loop evicts them. slowapi caps how often one IP
# can hit the endpoint. We deliberately keep the limit generous (5/minute)
# so legitimate use — e.g. a user creating a room and accidentally hitting
# "Create" twice — is never blocked, but a flood from one source is.
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS is wide-open so you can run the React dev server against this backend.
# In production the SPA is served from the same origin, so this is a no-op.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# API: rooms
# ---------------------------------------------------------------------------
def detect_lan_ip() -> str:
    """Best-effort local LAN IPv4 detection for cross-device share links."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # No packets are sent; connect picks the outbound interface.
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
        return ip
    except Exception:
        return "127.0.0.1"
    finally:
        try:
            sock.close()
        except Exception:
            pass


@app.get("/api/share-base")
async def share_base():
    """Return the preferred base URL for links that should work on phones."""
    configured = (os.getenv("SHARE_BASE_URL") or "").strip()
    if configured:
        return {"base_url": configured.rstrip("/")}

    host = detect_lan_ip()
    port = os.getenv("PORT", "8000")
    return {"base_url": f"http://{host}:{port}"}


@app.post("/api/rooms")
@limiter.limit("5/minute")
async def create_room(request: Request):
    code = generate_room_code()
    rooms[code] = Room(code)
    return {"code": code}


@app.get("/api/rooms/{code}")
async def check_room(code: str):
    code = code.upper().strip()
    room = rooms.get(code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    room.touch()
    return {
        "code": code,
        "message_count": len(room.messages),
        "connected_users": len(room.connections),
        "created_at": room.created_at.isoformat(),
    }


@app.get("/api/rooms/{code}/messages")
async def get_messages(code: str):
    code = code.upper().strip()
    room = rooms.get(code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"messages": room.messages}


@app.post("/api/rooms/{code}/upload")
async def upload_file(code: str, file: UploadFile = File(...)):
    code = code.upper().strip()
    room = rooms.get(code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    content_type = (file.content_type or "").lower()
    if content_type in ALLOWED_IMAGE_TYPES:
        msg_type = "image"
    elif content_type in ALLOWED_VIDEO_TYPES:
        msg_type = "video"
    else:
        msg_type = "file"

    # Read into memory with a hard size cap. For very large uploads you'd want
    # to stream to disk instead — 50 MB in memory is fine for this use case.
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size is {MAX_FILE_SIZE // (1024 * 1024)} MB",
        )
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    # Never trust the client's filename — generate our own, keep the extension
    original = file.filename or "file"
    ext = Path(original).suffix.lower()[:10]  # cap extension length
    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / safe_name
    dest.write_bytes(contents)

    room.files.append(safe_name)
    room.touch()

    return {
        "url": f"/uploads/{safe_name}",
        "type": msg_type,
        "filename": original,
        "size": len(contents),
        "content_type": content_type,
    }


@app.get("/uploads/{filename}")
async def serve_upload(filename: str):
    """Serve an uploaded file. Guards against directory traversal."""
    # Reject any filename with path separators outright
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    filepath = (UPLOADS_DIR / filename).resolve()
    # Final belt-and-suspenders: resolved path must stay inside UPLOADS_DIR
    try:
        filepath.relative_to(UPLOADS_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Forbidden")

    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(filepath)


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------
@app.websocket("/ws/{code}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, code: str, user_id: str):
    code = code.upper().strip()
    await websocket.accept()

    room = rooms.get(code)
    if not room:
        await websocket.send_json({"type": "error", "message": "Room not found"})
        await websocket.close(code=4004)
        return

    # If a user_id reconnects, drop the old socket gracefully
    old = room.connections.get(user_id)
    if old is not None and old is not websocket:
        try:
            await old.close()
        except Exception:
            pass

    room.connections[user_id] = websocket
    room.touch()

    # 1. Send full history to the newly connected client
    try:
        await websocket.send_json({
            "type": "history",
            "messages": room.visible_messages_for(user_id),
        })
    except Exception:
        room.connections.pop(user_id, None)
        return

    # 2. Announce join to everyone
    await room.broadcast({
        "type": "system",
        "event": "user_joined",
        "user_id": user_id,
        "connected": len(room.connections),
        "timestamp": now_iso(),
    })

    try:
        while True:
            data = await websocket.receive_json()

            msg_type = data.get("type")

            if msg_type == "edit":
                message_id = data.get("message_id")
                new_content = data.get("content")
                if not isinstance(message_id, str) or not isinstance(new_content, str):
                    continue

                new_content = new_content.strip()
                if not message_id or not new_content:
                    continue
                if len(new_content) > 50_000:
                    new_content = new_content[:50_000]

                message = room.find_message(message_id)
                if not message:
                    continue
                if message.get("user_id") != user_id:
                    continue
                if message.get("type") not in ("text", "code"):
                    continue

                message["content"] = new_content
                message["edited_at"] = now_iso()
                if message.get("type") == "code":
                    lang = data.get("language") or message.get("language") or "plaintext"
                    if isinstance(lang, str) and len(lang) <= 20:
                        message["language"] = lang
                    else:
                        message["language"] = "plaintext"

                room.touch()
                await room.broadcast({"type": "message_edited", "message": message})
                continue

            if msg_type == "react":
                message_id = data.get("message_id")
                emoji = data.get("emoji")
                mode = data.get("mode", "add")  # "add" or "remove"
                if not isinstance(message_id, str) or not isinstance(emoji, str):
                    continue
                emoji = emoji.strip()
                if not message_id or not emoji or len(emoji) > 16:
                    continue

                message = room.find_message(message_id)
                if not message:
                    continue

                reactions = message.get("reactions")
                if not isinstance(reactions, dict):
                    reactions = {}
                    message["reactions"] = reactions

                # If removing a reaction, delete the user from that emoji
                if mode == "remove":
                    users = reactions.get(emoji)
                    if isinstance(users, list):
                        next_users = [uid for uid in users if uid != user_id]
                        if next_users:
                            reactions[emoji] = next_users
                        else:
                            reactions.pop(emoji, None)
                else:
                    # Mode is "add": remove from any other emoji, add to this one
                    # One user can have only one active emoji reaction per message.
                    for existing_emoji, existing_users in list(reactions.items()):
                        if isinstance(existing_users, list) and user_id in existing_users:
                            next_users = [uid for uid in existing_users if uid != user_id]
                            if next_users:
                                reactions[existing_emoji] = next_users
                            else:
                                reactions.pop(existing_emoji, None)

                    users = reactions.get(emoji)
                    if not isinstance(users, list):
                        users = []

                    if user_id not in users:
                        users.append(user_id)

                    if users:
                        reactions[emoji] = users

                if not reactions:
                    message.pop("reactions", None)

                room.touch()
                await room.broadcast({
                    "type": "message_reacted",
                    "message_id": message_id,
                    "reactions": message.get("reactions", {}),
                })
                continue

            if msg_type == "delete":
                message_id = data.get("message_id")
                mode = data.get("mode")
                if not isinstance(message_id, str) or not isinstance(mode, str):
                    continue
                if mode not in ("me", "everyone"):
                    continue

                message = room.find_message(message_id)
                if not message:
                    continue

                if mode == "me":
                    deleted_for = message.get("deleted_for")
                    if not isinstance(deleted_for, list):
                        deleted_for = []
                    if user_id not in deleted_for:
                        deleted_for.append(user_id)
                    message["deleted_for"] = deleted_for
                    room.touch()
                    try:
                        await websocket.send_json({
                            "type": "message_deleted_me",
                            "message_id": message_id,
                        })
                    except Exception:
                        pass
                    continue

                # Unsend for everyone is only allowed for the original sender.
                if message.get("user_id") != user_id:
                    continue

                removed = room.remove_message(message_id)
                if not removed:
                    continue

                if removed.get("type") in ("image", "video", "file"):
                    url = removed.get("content") or ""
                    if isinstance(url, str) and url.startswith("/uploads/"):
                        filename = url.rsplit("/", 1)[-1]
                        try:
                            room.files = [f for f in room.files if f != filename]
                            (UPLOADS_DIR / filename).unlink(missing_ok=True)
                        except Exception:
                            pass

                room.touch()
                await room.broadcast({
                    "type": "message_deleted",
                    "message_id": message_id,
                })
                continue

            content = (data.get("content") or "").strip() if isinstance(data.get("content"), str) else ""

            if msg_type not in ("text", "code", "image", "video", "file"):
                # Ignore unknown types — defensive against client bugs or probing
                continue

            if msg_type in ("text", "code") and not content:
                continue

            if msg_type in ("image", "video", "file") and not content:
                # File messages must carry the URL returned from /upload
                continue

            # Hard cap on payload size for text/code (prevent memory blow-up)
            if msg_type in ("text", "code") and len(content) > 50_000:
                content = content[:50_000]

            message = {
                "id": str(uuid.uuid4()),
                "type": msg_type,
                "content": content,
                "user_id": user_id,
                "timestamp": now_iso(),
            }

            reply_to_id = data.get("reply_to_id")
            if isinstance(reply_to_id, str) and reply_to_id.strip():
                original = room.find_message(reply_to_id.strip())
                if original:
                    message["reply_to"] = {
                        "id": original.get("id"),
                        "user_id": original.get("user_id"),
                        "type": original.get("type"),
                        "content_preview": message_preview(original),
                    }

            if msg_type == "code":
                lang = data.get("language") or "plaintext"
                if isinstance(lang, str) and len(lang) <= 20:
                    message["language"] = lang
                else:
                    message["language"] = "plaintext"
            if msg_type in ("image", "video", "file"):
                filename = data.get("filename") or ""
                if isinstance(filename, str):
                    message["filename"] = filename[:200]
                message["content_type"] = data.get("content_type") or ""

            room.add_message(message)
            await room.broadcast({"type": "message", "message": message})

    except WebSocketDisconnect:
        pass
    except Exception:
        # Silent recovery — any unexpected error just disconnects this client
        pass
    finally:
        # Only remove this connection if it's still the one we registered
        if room.connections.get(user_id) is websocket:
            room.connections.pop(user_id, None)
            try:
                await room.broadcast({
                    "type": "system",
                    "event": "user_left",
                    "user_id": user_id,
                    "connected": len(room.connections),
                    "timestamp": now_iso(),
                })
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Health + SPA serving
# ---------------------------------------------------------------------------
@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health(request: Request):
    """Liveness probe for Render and UptimeRobot.

    Accepts both GET and HEAD because some monitors (UptimeRobot included)
    issue HEAD requests, and FastAPI's @app.get decorator alone returns 405
    for HEAD. Body is empty for HEAD; the JSON body is only sent for GET.
    """
    if request.method == "HEAD":
        return Response(status_code=200)
    return {"status": "ok", "rooms": len(rooms)}


def spa_index_response() -> FileResponse:
    # Force clients to revalidate the HTML shell so it always points at the
    # latest hashed JS/CSS bundles after each build.
    return FileResponse(
        STATIC_DIR / "index.html",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


# Mount the built React app last so /api and /ws routes take precedence.
if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        # Never serve the SPA for API or WS paths — those would 404 from the
        # specific routes above, which is the correct behavior.
        if full_path.startswith(("api/", "ws/", "uploads/", "assets/")):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        # Try to serve a concrete static file (favicon, etc), otherwise index
        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return spa_index_response()
else:
    @app.get("/")
    async def root_placeholder():
        return {
            "message": "ShareBox backend is running, but the frontend has not been built yet.",
            "hint": "Run `cd frontend && npm install && npm run build` to generate backend/static.",
        }


if __name__ == "__main__":
    import uvicorn
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=bool(os.getenv("RELOAD")),
    )
