"""Thin Supabase wrapper for upserts with retry.

We keep this file dependency-light so it can be imported in dry-run / sample mode
without `supabase-py` actually being installed (the import is lazy).
"""

from __future__ import annotations

import logging
import os
from datetime import UTC
from typing import Any

from tenacity import retry, stop_after_attempt, wait_exponential

log = logging.getLogger(__name__)


def client_from_env() -> Any:
    """Build a Supabase client from env. Raises if required vars are missing."""
    from supabase import create_client  # lazy import — keeps dry-run lightweight

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(url, key)


_RETRY = dict(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=2, max=8),
    reraise=True,
)


@retry(**_RETRY)
def upsert_brand(client: Any, row: dict[str, Any]) -> int:
    """Upsert brand by name (and parent_company tuple). Returns brand.id."""
    name = row["name"]
    parent = row.get("parent_company")

    # Manual dedup — supabase-py upsert doesn't trivially handle composite unique
    # with NULLs, so we look up first.
    existing = (
        client.table("brand")
        .select("id")
        .eq("name", name)
        .is_("parent_company", "null" if parent is None else parent)
        .limit(1)
        .execute()
    )
    if existing.data:
        return int(existing.data[0]["id"])

    inserted = client.table("brand").insert(row).execute()
    return int(inserted.data[0]["id"])


@retry(**_RETRY)
def upsert_product(client: Any, row: dict[str, Any]) -> int:
    """Upsert product by barcode. Returns product.id."""
    result = (
        client.table("product")
        .upsert(row, on_conflict="barcode")
        .execute()
    )
    return int(result.data[0]["id"])


@retry(**_RETRY)
def upsert_nutriment(client: Any, row: dict[str, Any]) -> None:
    client.table("nutriment").upsert(row, on_conflict="product_id,fetched_at").execute()


@retry(**_RETRY)
def upsert_ingredients(client: Any, product_id: int, rows: list[dict[str, Any]]) -> None:
    """Replace ingredient list for a product (delete-then-insert)."""
    client.table("ingredient").delete().eq("product_id", product_id).execute()
    if not rows:
        return
    payload = [dict(r, product_id=product_id) for r in rows]
    client.table("ingredient").insert(payload).execute()


@retry(**_RETRY)
def start_scrape_run(client: Any, source: str) -> int:
    res = client.table("scrape_run").insert({"source": source, "status": "running"}).execute()
    return int(res.data[0]["id"])


@retry(**_RETRY)
def finish_scrape_run(
    client: Any,
    run_id: int,
    status: str,
    rows_upserted: int = 0,
    rows_skipped: int = 0,
    error: str | None = None,
) -> None:
    from datetime import datetime

    client.table("scrape_run").update(
        {
            "status": status,
            "finished_at": datetime.now(UTC).isoformat(),
            "rows_upserted": rows_upserted,
            "rows_skipped": rows_skipped,
            "error": error,
        }
    ).eq("id", run_id).execute()


def verify_korea_leak(client: Any) -> int:
    """Return row count of v_korea_leak_check; non-zero is a hard failure."""
    res = client.table("v_korea_leak_check").select("id", count="exact").execute()
    return int(res.count or 0)
