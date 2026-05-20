"""Filter logic: cat-food + Korea exclusion."""

from __future__ import annotations

import json
from pathlib import Path

from scripts import normalize

FIXTURE = Path(__file__).parent / "fixtures" / "opff_sample.jsonl"


def _load_fixture() -> list[dict]:
    with FIXTURE.open("r", encoding="utf-8") as fp:
        return [json.loads(line) for line in fp if line.strip()]


def test_is_cat_food_true():
    item = {"categories_tags": ["en:cat-food", "en:dry-cat-food"]}
    assert normalize.is_cat_food(item) is True


def test_is_cat_food_false_on_dog_food():
    item = {"categories_tags": ["en:dog-food"]}
    assert normalize.is_cat_food(item) is False


def test_is_korea_true_by_country_tag():
    item = {"countries_tags": ["en:south-korea"]}
    assert normalize.is_korea(item) is True


def test_is_korea_true_by_url():
    item = {"countries_tags": [], "url": "https://example.kr/product/1"}
    assert normalize.is_korea(item) is True


def test_is_korea_false_on_us():
    item = {"countries_tags": ["en:united-states"], "url": "https://us.example.com/x"}
    assert normalize.is_korea(item) is False


def test_fixture_counts():
    """8 of 10 sample rows are cat-food AND non-KR."""
    rows = _load_fixture()
    assert len(rows) == 10
    kept = [r for r in rows if normalize.is_cat_food(r) and not normalize.is_korea(r)]
    assert len(kept) == 8

    excluded_kr = [r for r in rows if normalize.is_korea(r)]
    assert len(excluded_kr) == 1

    excluded_dog = [r for r in rows if not normalize.is_cat_food(r)]
    assert len(excluded_dog) == 1
