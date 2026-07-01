"""
Unit tests for the Room class — message storage, edits, deletes, reactions.

These are pure-Python tests (no HTTP) so they run fast and isolate the data
model from the transport layer.
"""
from main import Room


def _msg(user_id: str = "u1", type_: str = "text", content: str = "hi") -> dict:
    return {
        "id": "m1",
        "type": type_,
        "content": content,
        "user_id": user_id,
        "timestamp": "2026-07-01T00:00:00+00:00",
    }


def test_add_message_appends_and_touches():
    room = Room("ABC123")
    room.add_message(_msg())
    assert len(room.messages) == 1
    assert room.messages[0]["id"] == "m1"
    assert room.last_activity > room.created_at


def test_add_message_enforces_ring_buffer():
    from main import MAX_MESSAGES_PER_ROOM
    room = Room("ABC123")
    for i in range(MAX_MESSAGES_PER_ROOM + 50):
        room.add_message({**_msg(), "id": f"m{i}"})
    assert len(room.messages) == MAX_MESSAGES_PER_ROOM
    # Oldest messages evicted; newest preserved
    assert room.messages[-1]["id"] == f"m{MAX_MESSAGES_PER_ROOM + 49}"
    assert room.messages[0]["id"] == "m50"


def test_remove_message_returns_removed():
    room = Room("ABC123")
    room.add_message(_msg())
    removed = room.remove_message("m1")
    assert removed is not None
    assert removed["id"] == "m1"
    assert room.messages == []


def test_remove_unknown_message_returns_none():
    room = Room("ABC123")
    assert room.remove_message("nope") is None


def test_find_message_returns_none_when_missing():
    room = Room("ABC123")
    assert room.find_message("nope") is None


def test_visible_messages_for_respects_deleted_for():
    room = Room("ABC123")
    msg = _msg()
    msg["deleted_for"] = ["u2"]
    room.add_message(msg)
    # u2 doesn't see it
    assert room.visible_messages_for("u2") == []
    # u1 still does
    assert len(room.visible_messages_for("u1")) == 1


def test_visible_messages_for_ignores_non_list_deleted_for():
    """Defensive: a malformed deleted_for should not crash the filter."""
    room = Room("ABC123")
    msg = _msg()
    msg["deleted_for"] = "not a list"  # type: ignore[assignment]
    room.add_message(msg)
    assert len(room.visible_messages_for("u1")) == 1