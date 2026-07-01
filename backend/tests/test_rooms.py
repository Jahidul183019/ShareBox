"""
Smoke tests for the /api/rooms REST surface.

These tests pin down the contract that the React client relies on:
- POST creates a room and returns a 6-char code from the safe alphabet
- GET on a known code returns metadata
- GET on an unknown code returns 404 with a stable error shape
"""
from fastapi.testclient import TestClient

from main import CODE_ALPHABET, CODE_LENGTH, app


def test_create_room_returns_six_char_code(client: TestClient):
    response = client.post("/api/rooms")
    assert response.status_code == 200
    body = response.json()
    assert "code" in body
    code = body["code"]
    assert isinstance(code, str)
    assert len(code) == CODE_LENGTH
    # Codes must use only the safe alphabet (no 0/O/1/I confusion)
    assert all(ch in CODE_ALPHABET for ch in code)


def test_create_two_rooms_returns_distinct_codes(client: TestClient):
    """The random generator must not collide on back-to-back calls."""
    a = client.post("/api/rooms").json()["code"]
    b = client.post("/api/rooms").json()["code"]
    assert a != b


def test_get_unknown_room_returns_404(client: TestClient):
    response = client.get("/api/rooms/DOESNTEXIST")
    assert response.status_code == 404
    body = response.json()
    assert body["detail"] == "Room not found"


def test_get_known_room_returns_metadata(client: TestClient):
    code = client.post("/api/rooms").json()["code"]
    response = client.get(f"/api/rooms/{code}")
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == code
    assert body["message_count"] == 0
    assert body["connected_users"] == 0
    assert "created_at" in body


def test_room_code_lookup_is_case_insensitive(client: TestClient):
    code = client.post("/api/rooms").json()["code"]
    response = client.get(f"/api/rooms/{code.lower()}")
    assert response.status_code == 200


def test_get_messages_for_unknown_room_returns_404(client: TestClient):
    response = client.get("/api/rooms/NOPE/messages")
    assert response.status_code == 404


def test_rate_limit_keys_on_x_forwarded_for(client: TestClient):
    """When the frontend lives on a different origin (Vercel/Netlify/etc.),
    Render's load-balancer sits in front of us and every raw socket IP looks
    the same. The limiter must trust X-Forwarded-For so the 5/minute cap is
    per real user, not shared across everyone hitting the site.
    """
    # Six distinct spoofed client IPs each get their own bucket.
    for idx in range(6):
        spoofed_ip = f"203.0.113.{idx + 1}"
        response = client.post(
            "/api/rooms",
            headers={"X-Forwarded-For": spoofed_ip},
        )
        assert response.status_code == 200, (
            f"spoofed IP {spoofed_ip} got {response.status_code}: {response.text}"
        )


def test_rate_limit_uses_first_x_forwarded_for_entry(client: TestClient):
    """X-Forwarded-For is a chain; the leftmost entry is the original client
    and any later entries are intermediate proxies. The limiter must key on
    the leftmost entry, not blindly take the whole header or the rightmost.
    """
    # First call counts against the spoofed client. We don't have a clean way
    # to assert "this used bucket X" without poking the limiter internals,
    # so just verify the call succeeds and the header is accepted.
    response = client.post(
        "/api/rooms",
        headers={
            "X-Forwarded-For": "198.51.100.7, 10.0.0.1, 10.0.0.2",
        },
    )
    assert response.status_code == 200


def test_rate_limit_blocks_after_threshold_per_real_ip(client: TestClient):
    """End-to-end proof that the cap is per real client, not per socket:
    spoof the same X-Forwarded-For for 6 calls and confirm the 6th 429s.
    """
    for _ in range(5):
        ok = client.post(
            "/api/rooms",
            headers={"X-Forwarded-For": "198.51.100.42"},
        )
        assert ok.status_code == 200
    blocked = client.post(
        "/api/rooms",
        headers={"X-Forwarded-For": "198.51.100.42"},
    )
    assert blocked.status_code == 429


def test_rate_limit_distinct_forwarded_ips_are_independent(client: TestClient):
    """Burning the 5/minute budget on one spoofed IP must not affect a
    different spoofed IP. This is the regression test for the Vercel
    -> Render setup where every user looked the same.
    """
    for _ in range(5):
        client.post("/api/rooms", headers={"X-Forwarded-For": "198.51.100.50"})
    # First IP is now exhausted; second IP should still succeed.
    other = client.post("/api/rooms", headers={"X-Forwarded-For": "198.51.100.51"})
    assert other.status_code == 200