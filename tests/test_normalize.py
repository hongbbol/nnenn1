"""Normalize OPFF item dicts → row dicts."""

from __future__ import annotations

import json
from pathlib import Path

from scripts import normalize

FIXTURE = Path(__file__).parent / "fixtures" / "opff_sample.jsonl"


def _first_us_item() -> dict:
    with FIXTURE.open("r", encoding="utf-8") as fp:
        for line in fp:
            item = json.loads(line)
            if "en:united-states" in (item.get("countries_tags") or []):
                if normalize.is_cat_food(item):
                    return item
    raise AssertionError("no US cat-food row in fixture")


def test_to_brand_picks_first_token():
    assert normalize.to_brand({"brands": "Acme, Subsidiary"}) == {
        "name": "Acme",
        "parent_company": None,
        "hq_country": None,
    }


def test_to_brand_none_when_empty():
    assert normalize.to_brand({"brands": ""}) is None


def test_to_product_extracts_barcode_and_country():
    item = _first_us_item()
    row = normalize.to_product(item)
    assert row is not None
    assert row["barcode"] == "1000000000001"
    assert row["product_name"].startswith("Acme")
    assert row["source_country"] == "US"
    assert row["form"] == "dry"
    assert row["source_url"].startswith("https://world.openpetfoodfacts.org/")


def test_to_product_returns_none_without_name():
    assert normalize.to_product({"code": "x"}) is None


def test_to_nutriment_macros_pass_through():
    item = _first_us_item()
    row = normalize.to_nutriment(item, source_country="US")
    assert row["protein_pct"] == 32.0
    assert row["fat_pct"] == 15.0
    assert row["fiber_pct"] == 3.5
    assert row["moisture_pct"] == 10.0
    assert row["energy_kcal_per_100g"] == 380
    assert row["standard"] == "AAFCO"
    assert isinstance(row["raw_json"], dict)


def test_to_nutriment_energy_kj_conversion():
    item = {"nutriments": {"energy_100g": 1672}}  # ~400 kcal
    row = normalize.to_nutriment(item)
    assert row["energy_kcal_per_100g"] is not None
    assert 399 < row["energy_kcal_per_100g"] < 401


def test_infer_standard():
    assert normalize.infer_standard("US") == "AAFCO"
    assert normalize.infer_standard("DE") == "FEDIAF"
    assert normalize.infer_standard("JP") == "other"
    assert normalize.infer_standard(None) == "other"


def test_to_ingredients_uses_en_id_for_name_en():
    item = {"ingredients": [{"text": "Pollo", "id": "en:chicken"}, {"text": "Arroz"}]}
    rows = normalize.to_ingredients(item)
    assert rows[0]["name_original"] == "Pollo"
    assert rows[0]["name_en"] == "chicken"
    assert rows[1]["name_en"] is None
