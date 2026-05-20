"""OPFF item → normalized row dicts.

Mapping rules:
- brand    : `brands` first comma-separated token.
- product  : code/_id → barcode; `product_name` fallback to `product_name_en`.
- nutriment: `nutriments.*_100g` are already g/100g for macronutrients.
- ingredient: list of `{text, id}` items (id is `en:<canonical>`).

Filters:
- is_cat_food: `en:cat-food` in `categories_tags`.
- is_korea:    `en:south-korea` or `en:korea` in `countries_tags`,
               or `source_url` ends in `.kr`.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

# ----- ISO country / standard ---------------------------------------------------

_COUNTRY_TAG_TO_ISO: dict[str, str] = {
    "en:united-states": "US",
    "en:united-states-of-america": "US",
    "en:usa": "US",
    "en:canada": "CA",
    "en:mexico": "MX",
    "en:united-kingdom": "GB",
    "en:germany": "DE",
    "en:france": "FR",
    "en:italy": "IT",
    "en:spain": "ES",
    "en:netherlands": "NL",
    "en:belgium": "BE",
    "en:sweden": "SE",
    "en:denmark": "DK",
    "en:finland": "FI",
    "en:norway": "NO",
    "en:austria": "AT",
    "en:portugal": "PT",
    "en:ireland": "IE",
    "en:poland": "PL",
    "en:czechia": "CZ",
    "en:czech-republic": "CZ",
    "en:hungary": "HU",
    "en:romania": "RO",
    "en:greece": "GR",
    "en:bulgaria": "BG",
    "en:slovakia": "SK",
    "en:slovenia": "SI",
    "en:croatia": "HR",
    "en:estonia": "EE",
    "en:latvia": "LV",
    "en:lithuania": "LT",
    "en:malta": "MT",
    "en:cyprus": "CY",
    "en:luxembourg": "LU",
    "en:japan": "JP",
    "en:china": "CN",
    "en:south-korea": "KR",
    "en:korea": "KR",
    "en:australia": "AU",
    "en:new-zealand": "NZ",
    "en:switzerland": "CH",
}

_AAFCO_COUNTRIES = {"US", "CA", "MX"}
_FEDIAF_COUNTRIES = {
    "GB", "DE", "FR", "IT", "ES", "NL", "BE", "SE", "DK", "FI", "NO", "AT",
    "PT", "IE", "PL", "CZ", "HU", "RO", "GR", "BG", "SK", "SI", "HR", "EE",
    "LV", "LT", "MT", "CY", "LU", "CH",
}


# ----- filters ------------------------------------------------------------------


def _tags(item: dict[str, Any], key: str) -> list[str]:
    val = item.get(key) or []
    if isinstance(val, str):
        return [t.strip().lower() for t in val.split(",") if t.strip()]
    if isinstance(val, list):
        return [str(t).strip().lower() for t in val if t]
    return []


def is_cat_food(item: dict[str, Any]) -> bool:
    return "en:cat-food" in _tags(item, "categories_tags")


def is_korea(item: dict[str, Any]) -> bool:
    tags = _tags(item, "countries_tags")
    if "en:south-korea" in tags or "en:korea" in tags:
        return True
    url = (item.get("url") or item.get("source_url") or "").lower()
    return url.endswith(".kr") or ".kr/" in url


# ----- helpers ------------------------------------------------------------------


def _first_country_iso(item: dict[str, Any], exclude_kr: bool = True) -> str | None:
    for tag in _tags(item, "countries_tags"):
        iso = _COUNTRY_TAG_TO_ISO.get(tag)
        if iso and (not exclude_kr or iso != "KR"):
            return iso
    return None


def _infer_form(item: dict[str, Any]) -> str | None:
    tags = _tags(item, "categories_tags")
    for tag in tags:
        if "dry" in tag:
            return "dry"
        if "wet" in tag or "canned" in tag:
            return "wet"
        if "treat" in tag:
            return "treat"
        if "raw" in tag:
            return "raw"
    return None


def _barcode(item: dict[str, Any]) -> str | None:
    return item.get("code") or item.get("_id") or item.get("id")


def _safe_num(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


# ----- public mappers -----------------------------------------------------------


def to_brand(item: dict[str, Any]) -> dict[str, Any] | None:
    brands_raw = item.get("brands") or ""
    if not brands_raw:
        return None
    first = brands_raw.split(",")[0].strip()
    if not first:
        return None
    return {"name": first, "parent_company": None, "hq_country": None}


def to_product(item: dict[str, Any]) -> dict[str, Any] | None:
    barcode = _barcode(item)
    name = (
        item.get("product_name")
        or item.get("product_name_en")
        or item.get("generic_name")
        or item.get("generic_name_en")
        or ""
    )
    name = name.strip()
    if not barcode or not name:
        return None
    source_url = (
        item.get("url")
        or item.get("source_url")
        or f"https://world.openpetfoodfacts.org/product/{barcode}"
    )
    return {
        "barcode": str(barcode),
        "product_name": name,
        "life_stage": item.get("life_stage"),
        "form": _infer_form(item),
        "source_url": source_url,
        "source_country": _first_country_iso(item, exclude_kr=True),
        "fetched_at": datetime.now(UTC).isoformat(),
    }


def infer_standard(source_country: str | None) -> str:
    if not source_country:
        return "other"
    if source_country in _AAFCO_COUNTRIES:
        return "AAFCO"
    if source_country in _FEDIAF_COUNTRIES:
        return "FEDIAF"
    return "other"


def to_nutriment(item: dict[str, Any], source_country: str | None = None) -> dict[str, Any]:
    n = item.get("nutriments") or {}
    energy_kcal = _safe_num(n.get("energy-kcal_100g")) or _safe_num(n.get("energy_kcal_100g"))
    if energy_kcal is None:
        # convert kJ → kcal if needed
        kj = _safe_num(n.get("energy_100g")) or _safe_num(n.get("energy-kj_100g"))
        if kj is not None:
            energy_kcal = round(kj / 4.184, 2)
    return {
        "fetched_at": datetime.now(UTC).isoformat(),
        "protein_pct": _safe_num(n.get("proteins_100g")),
        "fat_pct": _safe_num(n.get("fat_100g")),
        "fiber_pct": _safe_num(n.get("fiber_100g")),
        "moisture_pct": _safe_num(n.get("moisture_100g") or n.get("water_100g")),
        "ash_pct": _safe_num(n.get("ash_100g")),
        "taurine_mg_per_kg": _safe_num(n.get("taurine_100g")),
        "energy_kcal_per_100g": energy_kcal,
        "standard": infer_standard(source_country),
        "raw_json": n,
    }


def to_ingredients(item: dict[str, Any]) -> list[dict[str, Any]]:
    ings = item.get("ingredients") or []
    if not isinstance(ings, list):
        return []
    rows: list[dict[str, Any]] = []
    for idx, ing in enumerate(ings, start=1):
        if not isinstance(ing, dict):
            continue
        text = (ing.get("text") or "").strip()
        if not text:
            continue
        ing_id = ing.get("id") or ""
        name_en = ing_id.split("en:", 1)[1].replace("-", " ") if ing_id.startswith("en:") else None
        rows.append(
            {
                "position": idx,
                "name_original": text,
                "name_en": name_en,
                "allergen_flag": bool(ing.get("allergen", False)),
            }
        )
    return rows


def to_rows(
    item: dict[str, Any],
) -> tuple[dict[str, Any] | None, dict[str, Any] | None, dict[str, Any], list[dict[str, Any]]]:
    """Returns (brand, product, nutriment, ingredients). product or brand may be None."""
    product = to_product(item)
    nutriment = to_nutriment(item, source_country=(product or {}).get("source_country"))
    return to_brand(item), product, nutriment, to_ingredients(item)
