"""
Shared pytest fixtures for the ShareBox test suite.

We import `main` once per session and hand out a fresh `TestClient` per test.
The `rooms` dict is reset between tests so each one starts with a clean slate.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture(scope="session")
def app():
    """The FastAPI app instance, shared across the whole test session."""
    return main.app


def _reset_limiter_state():
    """Clear slowapi's per-IP rate-limit counters between tests.

    The limiter is keyed by remote address (always "testclient" in TestClient),
    so without this reset, every test in a file that creates rooms would share
    the same 5/minute bucket and flake unpredictably.
    """
    limiter = getattr(main.app.state, "limiter", None)
    if limiter is None:
        return
    storage = getattr(limiter, "_storage", None)
    if storage is not None and hasattr(storage, "reset"):
        try:
            storage.reset()
        except Exception:
            # Storage backend may not support reset; tests will still run,
            # they may just need to be ordered carefully.
            pass


@pytest.fixture
def client(app):
    """A TestClient with `rooms` cleared and rate-limit counters reset before each test."""
    main.rooms.clear()
    _reset_limiter_state()
    return TestClient(app)


@pytest.fixture(autouse=True)
def _reset_rooms():
    """Defensive reset for tests that don't use the `client` fixture directly."""
    main.rooms.clear()
    _reset_limiter_state()
    yield
    main.rooms.clear()