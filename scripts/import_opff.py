"""OPFF baseline importer.

Usage:
    python scripts/import_opff.py [--sample N] [--dry-run] [--skip-download]

Flow:
    1. load compliance config
    2. build supabase client (unless --dry-run)
    3. fetch OPFF dump (unless --skip-download or sample mode with fixture)
    4. stream items → filter (cat-food, non-KR) → normalize → upsert
    5. record scrape_run row + verify_korea_leak
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
import traceback
from pathlib import Path

from dotenv import load_dotenv

from scripts import normalize
from scripts.compliance import load as load_compliance
from scripts.opff_client import fetch_dump, stream_items

log = logging.getLogger("import_opff")

FIXTURE_PATH = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "opff_sample.jsonl"
DEFAULT_DUMP_PATH = Path("data/openpetfoodfacts-products.jsonl.gz")


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="OPFF baseline importer")
    p.add_argument("--sample", type=int, default=0, help="Limit rows; 0 = no limit (full import).")
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Normalize but do not call Supabase.",
    )
    p.add_argument(
        "--skip-download",
        action="store_true",
        help="Reuse local dump if present (or fixture in sample mode).",
    )
    p.add_argument(
        "--dump-path",
        default=str(DEFAULT_DUMP_PATH),
        help=f"Local path for the gzipped dump (default: {DEFAULT_DUMP_PATH}).",
    )
    return p.parse_args()


def _resolve_dump_path(args: argparse.Namespace) -> Path:
    """Pick the right input file given flags."""
    if args.sample and args.skip_download:
        # sample + skip-download → use fixture
        return FIXTURE_PATH
    if args.skip_download:
        return Path(args.dump_path)
    return Path(args.dump_path)


def _maybe_fetch(args: argparse.Namespace, dump_url: str, user_agent: str) -> Path:
    target = _resolve_dump_path(args)
    if args.skip_download or args.sample:
        if not target.exists() and args.sample:
            # Fallback to fixture when in sample mode and no real dump downloaded.
            target = FIXTURE_PATH
        if target.exists():
            log.info("skip-download: using existing %s", target)
            return target
    return fetch_dump(dump_url, target, user_agent=user_agent)


def run(args: argparse.Namespace) -> int:
    load_dotenv()
    compliance = load_compliance()
    user_agent = compliance.user_agent or "nnenn1-cat-food-collector/0.1"
    opff = compliance.source("opff")
    dump_url = opff.get("dump_url") or os.environ.get("OPFF_DUMP_URL", "")

    if not dump_url and not (args.skip_download or args.sample):
        log.error("OPFF_DUMP_URL is required when not running in --sample/--skip-download mode")
        return 2

    # Acquire input file ---------------------------------------------------------
    try:
        dump_path = _maybe_fetch(args, dump_url, user_agent)
    except Exception:
        log.exception("fetch failed")
        return 3

    # Connect supabase -----------------------------------------------------------
    client = None
    run_id: int | None = None
    if not args.dry_run:
        from scripts.supabase_client import (
            client_from_env,
            finish_scrape_run,
            start_scrape_run,
            upsert_brand,
            upsert_ingredients,
            upsert_nutriment,
            upsert_product,
            verify_korea_leak,
        )

        client = client_from_env()
        run_id = start_scrape_run(client, source="opff")

    # Process --------------------------------------------------------------------
    rows_upserted = 0
    rows_skipped = 0
    processed = 0
    try:
        for item in stream_items(dump_path):
            processed += 1
            if args.sample and processed > args.sample:
                break

            if not normalize.is_cat_food(item):
                rows_skipped += 1
                continue
            if normalize.is_korea(item):
                rows_skipped += 1
                continue

            brand_row, product_row, nutriment_row, ingredient_rows = normalize.to_rows(item)
            if not product_row:
                rows_skipped += 1
                continue

            if args.dry_run:
                log.debug("dry-run product=%s brand=%s", product_row.get("barcode"), brand_row)
                rows_upserted += 1
                continue

            assert client is not None
            brand_id = upsert_brand(client, brand_row) if brand_row else None
            product_payload = dict(product_row)
            if brand_id is not None:
                product_payload["brand_id"] = brand_id
            product_id = upsert_product(client, product_payload)

            nutriment_payload = dict(nutriment_row, product_id=product_id)
            upsert_nutriment(client, nutriment_payload)
            upsert_ingredients(client, product_id, ingredient_rows)
            rows_upserted += 1

        log.info(
            "import done processed=%d upserted=%d skipped=%d",
            processed, rows_upserted, rows_skipped,
        )

        if not args.dry_run:
            assert client is not None
            leaks = verify_korea_leak(client)
            if leaks > 0:
                raise RuntimeError(f"v_korea_leak_check returned {leaks} rows; aborting")
            finish_scrape_run(
                client, run_id, status="success",
                rows_upserted=rows_upserted, rows_skipped=rows_skipped,
            )
        return 0

    except Exception as exc:
        log.exception("import failed")
        if not args.dry_run and client is not None and run_id is not None:
            from scripts.supabase_client import finish_scrape_run

            try:
                finish_scrape_run(
                    client, run_id, status="failed",
                    rows_upserted=rows_upserted, rows_skipped=rows_skipped,
                    error=f"{exc}\n{traceback.format_exc()}",
                )
            except Exception:
                log.exception("could not record failure in scrape_run")
        return 1


def main() -> None:
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    args = _parse_args()
    sys.exit(run(args))


if __name__ == "__main__":
    main()
