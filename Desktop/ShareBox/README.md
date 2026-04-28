# ShareBox

An ephemeral sharing app: create a room, hand someone the 6-character code, and exchange text, code snippets, images, and videos in real time. Rooms expire 24 hours after they go silent.

**Stack:** React (Vite) on the frontend, FastAPI + WebSockets on the backend, disk for uploaded files, in-memory for everything else.

---

## Quick start (pre-built, ready to host)

The frontend is already built into `backend/static/`, so you only need to run the backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Open **http://localhost:8000** in a browser. Create a room, copy the code (or the full link), and share it — anyone who enters that code joins the same room.

To run on a different port:

```bash
PORT=9000 python main.py
```

---

## Dev mode (hot reload on both ends)

If you want to modify the frontend, run the Vite dev server alongside the backend:

**Terminal 1 — backend with auto-reload:**

```bash
cd backend
python -m venv .venv              # first run only
source .venv/bin/activate
pip install -r requirements.txt   # first run (or when deps change)
RELOAD=1 python main.py
```

**Terminal 2 — frontend dev server:**

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api`, `/uploads`, and `/ws` to the backend on port 8000 — no CORS fiddling needed.

When you're done editing, rebuild once to refresh the production bundle:

```bash
cd frontend
npm run build:backend
```

This writes to `backend/static/`, and the next backend run serves the updated UI.

---

## Deployment

The simplest production setup is a single Python process behind a reverse proxy (nginx, Caddy, Cloudflare Tunnel, etc.) terminating TLS. A few examples:

### Render (recommended quick deploy)

This app is easiest to deploy as one backend service because the backend already serves the built frontend from `backend/static/`.

1. Push the repo to GitHub.
2. In Render, create a **Web Service** from this repo.
3. Configure:
    - **Runtime:** Python 3
    - **Branch:** `main`
    - **Root Directory:** `backend`
    - **Build Command:** `pip install -r requirements.txt`
    - **Start Command:** `python main.py`
4. Deploy and open the Render URL.

Notes:
- No manual env vars are required for a basic deploy.
- Render provides `PORT`; the app reads it automatically.
- Rooms are in-memory and uploads are local disk, so restarts/redeploys can clear active room state and files.

### Vercel (frontend-only, optional)

Vercel works well for the React frontend, but this backend should stay on a host that supports long-lived WebSockets (Render/Railway/Fly/etc.).

If frontend and backend are on different domains, configure the frontend to use explicit API/WS base URLs (for example via `VITE_API_BASE_URL` and `VITE_WS_BASE_URL`) instead of same-origin paths.

### systemd service

```ini
[Unit]
Description=ShareBox
After=network.target

[Service]
User=sharebox
WorkingDirectory=/opt/sharebox/backend
Environment="PORT=8000"
ExecStart=/opt/sharebox/backend/.venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

### Docker (optional — not included but trivial to add)

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY backend /app
RUN pip install --no-cache-dir -r requirements.txt
CMD ["python", "main.py"]
EXPOSE 8000
```

### Nginx (reverse proxy with WebSocket passthrough)

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
    client_max_body_size 60m;
}
```

The `Upgrade` / `Connection` headers are what lets WebSockets survive the proxy — without them `/ws` will 400.

---

## Configuration knobs

All defined at the top of `backend/main.py`:

| Constant                | Default        | What it controls                                     |
| ----------------------- | -------------- | ---------------------------------------------------- |
| `MAX_FILE_SIZE`         | 50 MB          | Per-file upload cap                                  |
| `ROOM_TTL_SECONDS`      | 24 hours       | How long a silent room survives before eviction      |
| `CLEANUP_INTERVAL`      | 1 hour         | How often the cleanup task runs                      |
| `MAX_MESSAGES_PER_ROOM` | 500            | Ring buffer size — older messages drop off past this |
| `ALLOWED_IMAGE_TYPES`   | jpeg/png/…     | MIME types accepted on upload                        |
| `ALLOWED_VIDEO_TYPES`   | mp4/webm/mov/… | Ditto for video                                      |

---

## Edge cases that are handled

- **Invalid / expired room codes** — the home screen surfaces a clean error, and opening a dead `/r/CODE` link shows a dedicated "room not found" screen instead of a blank room.
- **File upload limits** — backend enforces the size cap and MIME whitelist; frontend also checks size before uploading so large files fail fast.
- **Directory traversal on `/uploads/{filename}`** — rejects `..`, slashes, and verifies the resolved path is inside `uploads/`.
- **Reconnection** — the WebSocket client auto-reconnects with exponential backoff (1s → 10s cap). The status dot in the header shows the current state.
- **Same-user reconnects** — if a `user_id` reconnects while their old socket is still registered, the old socket is closed cleanly so you don't end up with ghosts.
- **Unbounded memory** — each room caps at 500 messages (ring buffer), text/code payloads cap at 50,000 chars, and silent rooms are evicted with their files deleted.
- **Back / forward navigation** — the URL is kept in sync (`/r/CODE`), so browser back and forward work and the link is shareable.
- **Mobile layout** — viewport and input layouts tuned down to 320 px; tabs, code blocks, and lightbox all adapt.

---

## Project layout

```
sharebox/
├── backend/
│   ├── main.py            # FastAPI app, rooms, WebSocket, uploads, SPA serving
│   ├── requirements.txt
│   ├── uploads/           # user-uploaded media (auto-cleaned with rooms)
│   └── static/            # built React SPA — served at /
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       └── components/
│           ├── Home.jsx
│           ├── Room.jsx
│           ├── MessageList.jsx
│           ├── MessageItem.jsx
│           ├── MessageInput.jsx
│           └── Lightbox.jsx
└── README.md
```

---

## Things you'd want to add for a real production deploy

1. **Persistent storage.** Everything is in memory today, so a backend restart wipes all rooms. Swap the `rooms` dict for SQLite + SQLAlchemy if you want rooms to survive deploys.
2. **Rate limiting.** There's no throttle on message volume or upload frequency. Add `slowapi` if you expose this publicly.
3. **Authentication or link tokens.** Anyone with a code joins. That's the point for a 2-person use case — but for a real product you'd want signed join tokens.
4. **Object storage for media.** Local disk works fine for one box; for multi-replica deployments put `/uploads/` on S3 or similar.
5. **Observability.** No structured logging or metrics today. `structlog` + Prometheus would be a good minimum.

---

## License

Do whatever you want with it.
