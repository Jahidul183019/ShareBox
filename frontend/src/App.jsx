import { useEffect, useState } from 'react';
import Home from './components/Home.jsx';
import Room from './components/Room.jsx';

const THEME_KEY = 'sharebox_theme';

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Ignore storage errors and fall through to system preference.
  }

  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

// Generate a stable per-browser user id so reconnects are recognized by the server
function getOrCreateUserId() {
  try {
    const existing = localStorage.getItem('sharebox_user_id');
    if (existing) return existing;
    const fresh = 'u_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('sharebox_user_id', fresh);
    return fresh;
  } catch {
    // Fall back for environments without localStorage (private mode, etc.)
    return 'u_' + Math.random().toString(36).slice(2, 10);
  }
}

// Parse /r/ABC123 from the URL for shareable-link support
function parseRoomFromPath() {
  const match = window.location.pathname.match(/^\/r\/([A-Z0-9]+)\/?$/i);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).toUpperCase();
  } catch {
    return match[1].toUpperCase();
  }
}

export default function App() {
  const [roomCode, setRoomCode] = useState(parseRoomFromPath());
  const [userId] = useState(getOrCreateUserId);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-in-room', roomCode ? 'true' : 'false');
  }, [roomCode]);

  // Keep URL in sync with state so browser back/forward works
  useEffect(() => {
    const target = roomCode ? `/r/${roomCode}` : '/';
    if (window.location.pathname !== target) {
      window.history.pushState(null, '', target);
    }
  }, [roomCode]);

  useEffect(() => {
    const onPop = () => setRoomCode(parseRoomFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <>
      {!roomCode && (
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span aria-hidden="true" className="theme-icon">
            {theme === 'dark' ? '☀' : '☾'}
          </span>
        </button>
      )}

      {!roomCode ? (
        <Home onEnter={setRoomCode} />
      ) : (
        <Room
          code={roomCode}
          userId={userId}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          onLeave={() => setRoomCode(null)}
        />
      )}
    </>
  );
}
