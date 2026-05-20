"""opff_client.stream_items basic coverage."""

from __future__ import annotations

from pathlib import Path

from scripts.opff_client import stream_items

FIXTURE = Path(__file__).parent / "fixtures" / "opff_sample.jsonl"


def test_stream_items_returns_ten_dicts():
    items = list(stream_items(FIXTURE))
    assert len(items) == 10
    assert all(isinstance(i, dict) for i in items)
    assert items[0]["code"] == "1000000000001"
