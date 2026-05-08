import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MessageList from './MessageList.jsx';
import MessageInput from './MessageInput.jsx';
import Lightbox from './Lightbox.jsx';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const WS_BASE = (import.meta.env.VITE_WS_BASE_URL || '').replace(/\/$/, '');

// Build the correct ws:// or wss:// URL regardless of http vs https
function wsUrlFor(code, userId) {
  if (WS_BASE) {
    return `${WS_BASE}/ws/${encodeURIComponent(code)}/${encodeURIComponent(userId)}`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/${encodeURIComponent(code)}/${encodeURIComponent(userId)}`;
}

export default function Room({ code, userId, theme, onToggleTheme, onLeave }) {
  const [messages, setMessages] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [connected, setConnected] = useState(0);
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected'
  const [roomMissing, setRoomMissing] = useState(false);
  const [toast, setToast] = useState('');
  const [lightbox, setLightbox] = useState(null); // { type, url, filename }
  const [shareOrigin, setShareOrigin] = useState(window.location.origin);

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const backoffRef = useRef(1000); // ms, doubles up to 10s
  const unmountedRef = useRef(false);

  // ------------------------------------------------------------
  // WebSocket lifecycle with exponential-backoff reconnect
  // ------------------------------------------------------------
  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    setStatus('connecting');

    let ws;
    try {
      ws = new WebSocket(wsUrlFor(code, userId));
    } catch {
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) return;
      setStatus('connected');
      backoffRef.current = 1000; // reset backoff on successful connect
    };

    ws.onmessage = (event) => {
      if (unmountedRef.current) return;
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (payload.type === 'history') {
        setMessages(payload.messages || []);
      } else if (payload.type === 'message') {
        setMessages((prev) => {
          // Guard against duplicates if the server ever re-sends
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
      } else if (payload.type === 'message_edited') {
        setMessages((prev) => prev.map((m) => (
          m.id === payload.message?.id ? payload.message : m
        )));
      } else if (payload.type === 'message_reacted') {
        setMessages((prev) => prev.map((m) => (
          m.id === payload.message_id
            ? { ...m, reactions: payload.reactions || {} }
            : m
        )));
      } else if (payload.type === 'message_deleted') {
        setMessages((prev) => prev.filter((m) => m.id !== payload.message_id));
        setReplyTo((prev) => (prev && prev.id === payload.message_id ? null : prev));
      } else if (payload.type === 'message_deleted_me') {
        setMessages((prev) => prev.filter((m) => m.id !== payload.message_id));
        setReplyTo((prev) => (prev && prev.id === payload.message_id ? null : prev));
      } else if (payload.type === 'system') {
        if (typeof payload.connected === 'number') {
          setConnected(payload.connected);
        }
        if (payload.event === 'user_joined' && payload.user_id !== userId) {
          showToast('Someone joined');
        } else if (payload.event === 'user_left' && payload.user_id !== userId) {
          showToast('Someone left');
        }
      } else if (payload.type === 'error') {
        if (payload.message === 'Room not found') {
          setRoomMissing(true);
        }
      }
    };

    ws.onclose = (ev) => {
      if (unmountedRef.current) return;
      // Server closed with 4004 → room is gone, don't retry
      if (ev.code === 4004) {
        setRoomMissing(true);
        setStatus('disconnected');
        return;
      }
      setStatus('disconnected');
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose will fire right after; handle reconnection there
    };
  }, [code, userId]);

  const scheduleReconnect = useCallback(() => {
    if (unmountedRef.current) return;
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    const delay = backoffRef.current;
    backoffRef.current = Math.min(backoffRef.current * 2, 10_000);
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    unmountedRef.current = false;
    // Verify room exists before opening a socket — avoids a confusing flash
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/rooms/${encodeURIComponent(code)}`);
        if (cancelled) return;
        if (res.status === 404) {
          setRoomMissing(true);
          return;
        }
        connect();
      } catch {
        // Offline or server down — still try to connect; WS will retry
        connect();
      }
    })();

    return () => {
      cancelled = true;
      unmountedRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch { /* ignore */ }
      }
    };
  }, [code, connect]);

  useEffect(() => {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/share-base`);
        if (!res.ok) return;
        const data = await res.json();
        const candidate = (data?.base_url || '').trim();
        if (!cancelled && candidate) {
          setShareOrigin(candidate.replace(/\/$/, ''));
        }
      } catch {
        // Keep default origin if detection fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------
  // Toast helper
  // ------------------------------------------------------------
  const toastTimerRef = useRef(null);
  function showToast(text) {
    setToast(text);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2200);
  }

  // ------------------------------------------------------------
  // Send helpers
  // ------------------------------------------------------------
  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      showToast('Not connected yet — try again in a moment');
      return false;
    }
    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch {
      showToast('Send failed');
      return false;
    }
  }, []);

  const sendText = useCallback((text) => {
    if (!text.trim()) return false;
    const ok = send({
      type: 'text',
      content: text,
      ...(replyTo?.id ? { reply_to_id: replyTo.id } : {}),
    });
    if (ok) setReplyTo(null);
    return ok;
  }, [send, replyTo]);

  const sendCode = useCallback((code_, language) => {
    if (!code_.trim()) return false;
    const ok = send({
      type: 'code',
      content: code_,
      language: language || 'plaintext',
      ...(replyTo?.id ? { reply_to_id: replyTo.id } : {}),
    });
    if (ok) setReplyTo(null);
    return ok;
  }, [send, replyTo]);

  const editMessage = useCallback((messageId, content, language) => {
    if (!messageId || !content?.trim()) return false;
    return send({
      type: 'edit',
      message_id: messageId,
      content,
      ...(language ? { language } : {}),
    });
  }, [send]);

  const reactMessage = useCallback((messageId, emoji, mode = 'add') => {
    if (!messageId || !emoji) return false;
    return send({ type: 'react', message_id: messageId, emoji, mode });
  }, [send]);

  const deleteMessage = useCallback((messageId, mode) => {
    if (!messageId || !mode) return false;
    return send({ type: 'delete', message_id: messageId, mode });
  }, [send]);

  const sendMedia = useCallback(async (file) => {
    if (!file) return false;
    // Client-side size check for a faster error message
    if (file.size > 50 * 1024 * 1024) {
      showToast('File exceeds the 50 MB limit');
      return false;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${encodeURIComponent(code)}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        showToast(detail.detail || `Upload failed (${res.status})`);
        return false;
      }
      const data = await res.json();
      return send({
        type: data.type,
        content: data.url,
        filename: data.filename,
        content_type: data.content_type,
      });
    } catch {
      showToast('Upload failed — check your connection');
      return false;
    }
  }, [code, send]);

  // ------------------------------------------------------------
  // Header helpers
  // ------------------------------------------------------------
  const shareLink = useMemo(
    () => `${shareOrigin}/r/${code}`,
    [code, shareOrigin]
  );

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      showToast('Code copied');
    } catch {
      showToast(code); // fallback: at least show it
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      showToast('Link copied');
    } catch {
      showToast('Could not copy');
    }
  }

  // ------------------------------------------------------------
  // Render: room-missing error state
  // ------------------------------------------------------------
  if (roomMissing) {
    return (
      <div className="home">
        <div className="home-card">
          <div className="logo">🕳️</div>
          <h1>Room not found</h1>
          <p className="tagline">
            Room <strong>{code}</strong> doesn't exist, or it expired after 24 hours of silence.
          </p>
          <button className="btn btn-primary" onClick={onLeave}>
            Go home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="room">
      <header className="room-header">
        <button className="leave-btn" onClick={onLeave} aria-label="Leave room">
          ←
        </button>
        <div className="room-header-info">
          <button className="code-display" onClick={copyCode} title="Click to copy code">
            <span className="code-label">CODE</span>
            <span className="code-value">{code}</span>
          </button>
          <button className="copy-link-btn" onClick={copyLink} title="Copy share link">
            Copy link
          </button>
        </div>
        <div className={`status status-${status}`}>
          <span className="status-dot" />
          <span className="status-text">
            {status === 'connected' && `${connected} online`}
            {status === 'connecting' && 'Connecting…'}
            {status === 'disconnected' && 'Reconnecting…'}
          </span>
        </div>
        <button
          type="button"
          className="theme-toggle-inline"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span aria-hidden="true" className="theme-icon">
            {theme === 'dark' ? '☀' : '☾'}
          </span>
        </button>
      </header>

      <MessageList
        messages={messages}
        userId={userId}
        onOpenMedia={setLightbox}
        onEditMessage={editMessage}
        onReactMessage={reactMessage}
        onReplyMessage={setReplyTo}
        onDeleteMessage={deleteMessage}
      />

      <MessageInput
        onSendText={sendText}
        onSendCode={sendCode}
        onSendMedia={sendMedia}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        disabled={status !== 'connected'}
      />

      {toast && <div className="toast">{toast}</div>}
      {lightbox && (
        <Lightbox item={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
