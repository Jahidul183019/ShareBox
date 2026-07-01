import { useState } from 'react';
import appIcon from '../assets/icon.svg';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export default function Home({ onEnter }) {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/rooms`, { method: 'POST' });
      if (res.status === 429) {
        throw new Error('Too many rooms created — wait a minute and try again');
      }
      if (!res.ok) throw new Error('Could not create a room');
      const data = await res.json();
      onEnter(data.code);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError('Enter a room code to join');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${encodeURIComponent(code)}`);
      if (res.status === 404) {
        setError(`No room with code "${code}" — double-check or create a new one`);
        return;
      }
      if (!res.ok) throw new Error('Server error — try again');
      onEnter(code);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="home">
      <div className="home-card">
        <div className="logo">
          <img src={appIcon} alt="ShareBox icon" className="logo-image" />
        </div>
        <h1>ShareBox</h1>
        <p className="tagline">
          Create a room, share the code, exchange text, code, pictures and video instantly.
        </p>

        <button
          className="btn btn-primary"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? 'Working…' : 'Create a new room'}
        </button>

        <div className="divider">
          <span>or join an existing room</span>
        </div>

        <form onSubmit={handleJoin} className="join-form">
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="Enter room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            maxLength={8}
            disabled={loading}
            className="code-input"
          />
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={loading || !joinCode.trim()}
          >
            Join
          </button>
        </form>

        {error && <div className="error">{error}</div>}

        <div className="hint">
          Rooms expire 24 hours after they fall silent. Nothing is stored beyond that.
        </div>
      </div>
    </div>
  );
}
