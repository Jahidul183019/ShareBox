import os
import sqlite3
from pathlib import Path
import time
from typing import Optional

DATABASE_URL = os.environ.get('DATABASE_URL')
_USE_POSTGRES = bool(DATABASE_URL)

DB_PATH = Path(__file__).resolve().parent / 'data.sqlite3'


def _pg_conn():
    # Import here to avoid hard requirement when only sqlite is used
    import psycopg2
    import psycopg2.extras
    # Be resilient to transient network/DNS issues during startup by retrying.
    max_retries = 5
    delay = 1.0
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            # set a reasonable connect timeout so attempts fail fast when unreachable
            conn = psycopg2.connect(DATABASE_URL, connect_timeout=10)
            return conn
        except Exception as e:
            last_err = e
            if attempt == max_retries:
                raise
            time.sleep(delay)
            delay = min(delay * 2, 10)


def get_conn():
    if _USE_POSTGRES:
        return _pg_conn()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_conn()
    # Use cursor factory for Postgres to return dict-like rows if available
    if _USE_POSTGRES:
        import psycopg2.extras
        cur = conn.cursor()
    else:
        cur = conn.cursor()
    if _USE_POSTGRES:
        cur.execute(
            '''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT
            )
            ''')
        cur.execute(
            '''
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at BIGINT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            ''')
    else:
        cur.execute(
            '''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT
            )
            ''')
        cur.execute(
            '''
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            ''')
    conn.commit()
    conn.close()


def create_session(token: str, user_id: int, ttl_seconds: int = 7 * 24 * 3600) -> None:
    conn = get_conn()
    if _USE_POSTGRES:
        import psycopg2.extras
        cur = conn.cursor()
        expires = int(time.time()) + int(ttl_seconds)
        cur.execute(
            'INSERT INTO sessions(token, user_id, expires_at) VALUES (%s, %s, %s) ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at',
            (token, user_id, expires)
        )
    else:
        cur = conn.cursor()
        expires = int(time.time()) + int(ttl_seconds)
        cur.execute('INSERT OR REPLACE INTO sessions(token, user_id, expires_at) VALUES (?,?,?)', (token, user_id, expires))
    conn.commit()
    conn.close()


def get_user_by_username(username: str):
    conn = get_conn()
    if _USE_POSTGRES:
        import psycopg2.extras
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute('SELECT * FROM users WHERE username = %s', (username,))
        row = cur.fetchone()
    else:
        cur = conn.cursor()
        cur.execute('SELECT * FROM users WHERE username = ?', (username,))
        row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def create_user(username: str, password_hash: str, name: str | None = None) -> int:
    conn = get_conn()
    try:
        if _USE_POSTGRES:
            import psycopg2.extras
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute('INSERT INTO users(username, password_hash, name) VALUES (%s, %s, %s) RETURNING id', (username, password_hash, name))
            uid = cur.fetchone()['id']
            conn.commit()
        else:
            cur = conn.cursor()
            cur.execute('INSERT INTO users(username, password_hash, name) VALUES (?,?,?)', (username, password_hash, name))
            conn.commit()
            uid = cur.lastrowid
        return uid
    except Exception as exc:
        conn.rollback()
        is_unique_violation = isinstance(exc, sqlite3.IntegrityError)
        if not is_unique_violation and _USE_POSTGRES:
            is_unique_violation = getattr(exc, 'pgcode', None) == '23505'
        if is_unique_violation:
            raise ValueError('username-taken') from exc
        raise
    finally:
        conn.close()


def get_user_by_id(user_id: int):
    conn = get_conn()
    if _USE_POSTGRES:
        import psycopg2.extras
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute('SELECT * FROM users WHERE id = %s', (user_id,))
        row = cur.fetchone()
    else:
        cur = conn.cursor()
        cur.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def update_user_name(user_id: int, name: str) -> None:
    conn = get_conn()
    if _USE_POSTGRES:
        cur = conn.cursor()
        cur.execute('UPDATE users SET name = %s WHERE id = %s', (name, user_id))
    else:
        cur = conn.cursor()
        cur.execute('UPDATE users SET name = ? WHERE id = ?', (name, user_id))
    conn.commit()
    conn.close()


def update_user_password(user_id: int, password_hash: str) -> None:
    conn = get_conn()
    if _USE_POSTGRES:
        cur = conn.cursor()
        cur.execute('UPDATE users SET password_hash = %s WHERE id = %s', (password_hash, user_id))
    else:
        cur = conn.cursor()
        cur.execute('UPDATE users SET password_hash = ? WHERE id = ?', (password_hash, user_id))
    conn.commit()
    conn.close()


def get_session(token: str):
    conn = get_conn()
    if _USE_POSTGRES:
        import psycopg2.extras
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute('SELECT * FROM sessions WHERE token = %s', (token,))
        row = cur.fetchone()
    else:
        cur = conn.cursor()
        cur.execute('SELECT * FROM sessions WHERE token = ?', (token,))
        row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def delete_session(token: str):
    conn = get_conn()
    if _USE_POSTGRES:
        cur = conn.cursor()
        cur.execute('DELETE FROM sessions WHERE token = %s', (token,))
    else:
        cur = conn.cursor()
        cur.execute('DELETE FROM sessions WHERE token = ?', (token,))
    conn.commit()
    conn.close()
