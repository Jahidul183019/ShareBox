"""
Tests for the /api/health endpoint.

This is the most important test in the suite — it pins down the contract that
uptime monitors (UptimeRobot, Render's health check) rely on. If any of these
break, the public-facing uptime signal goes red even though the service is
healthy. Specifically, this file would have caught the 405 regression that
took the ShareBox monitor down for 7 days.
"""
from fastapi.testclient import TestClient

from main import app


def test_health_get_returns_200_with_ok_status():
    """A plain GET must return 200 and a JSON body containing status='ok'."""
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "rooms" in body
    assert isinstance(body["rooms"], int)


def test_health_head_returns_200_with_empty_body():
    """HEAD must return 200 with no body — UptimeRobot uses HEAD probes.

    This is the regression test for the 7-day outage. If anyone changes
    /api/health back to a GET-only decorator, this test fails.
    """
    client = TestClient(app)
    response = client.head("/api/health")
    assert response.status_code == 200, (
        f"HEAD /api/health returned {response.status_code}; uptime monitors "
        "will mark the service down"
    )
    assert response.content == b""


def test_health_post_is_rejected():
    """POST must return 405 — we don't want arbitrary writes to the health
    endpoint. (Bonus: keeps the surface area tiny.)"""
    client = TestClient(app)
    response = client.post("/api/health")
    assert response.status_code == 405


def test_health_does_not_create_rooms():
    """Hitting /api/health must not allocate a room. This guards against
    anyone accidentally adding side-effects to the endpoint.

    Note: /api/health returns `rooms` as an integer (the count), not a list,
    so we just compare the integer value before and after hammering.
    """
    client = TestClient(app)
    before = client.get("/api/health").json()["rooms"]
    # Hammer the endpoint — none of these calls should ever allocate a room.
    for _ in range(10):
        client.get("/api/health")
        client.head("/api/health")
    after = client.get("/api/health").json()["rooms"]
    assert before == after, "health endpoint must be side-effect-free"