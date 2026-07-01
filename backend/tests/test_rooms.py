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