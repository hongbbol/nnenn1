# nnenn1

Global cat food nutrition data collection pipeline. The first milestone is an
**Open Pet Food Facts (OPFF) baseline importer** that downloads the public
nightly dump, filters to cat food and excludes the Korean market, normalizes
units, and upserts into a Supabase Postgres project. Tracks Issue
[hongbbol/nnenn1#1](https://github.com/hongbbol/nnenn1/issues/1).

## What

- Monthly cron (GitHub Actions, `0 18 1 * *` UTC) pulls the OPFF JSONL dump.
- Streaming parser keeps memory flat regardless of dump size.
- Filters: `categories_tags` contains `en:cat-food`, **excludes** any product
  whose `countries_tags` mentions South Korea or whose source URL is `.kr`.
- Six-table schema (`brand`, `product`, `nutriment`, `ingredient`,
  `snapshot_history`, `scrape_run`) with Row-Level Security so the `anon` key is
  read-only.
- Observability views: `v_korea_leak_check` (must be empty),
  `v_field_completeness` (NULL ratio per core nutrient).

## Setup

```bash
cp .env.example .env       # fill SUPABASE_URL, SERVICE_ROLE_KEY, CONTACT_EMAIL
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# Optional local Supabase stack:
supabase start
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

Required environment variables are documented in `.env.example`.

## Run

```bash
# Dry-run against fixture (no Supabase needed):
make import-sample

# Real import (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
python scripts/import_opff.py

# Sample 50 rows against a real Supabase:
python scripts/import_opff.py --sample 50

# Tests + lint:
make test
make lint
```

## Schedule

- GitHub Actions workflow `.github/workflows/monthly_import.yml` runs every
  month on the **1st at 18:00 UTC** and is also dispatchable manually with
  `sample` and `dry_run` inputs.
- The job uploads `scrape_run.log` as a workflow artifact.

## Compliance

- **User-Agent**: `nnenn1-cat-food-collector/0.1 (+mailto:${CONTACT_EMAIL})`
  (defined in `config/compliance.yaml` and applied to every HTTP request).
- **Contact**: set `CONTACT_EMAIL` so OPFF maintainers can reach you.
- **Rate limits**: OPFF read 15 req/min, search 10 req/min (configured but the
  baseline importer only consumes the static dump, so it stays well under).
- **Attribution (ODBL)**: Open Pet Food Facts data is licensed under the
  [Open Database License (ODBL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
  Downstream consumers of `product` / `nutriment` rows derived from OPFF must
  preserve this attribution.

## License

TBD — to be set before public release. Until then, treat the repo as
"all rights reserved" with the OPFF-derived data subject to ODBL.
