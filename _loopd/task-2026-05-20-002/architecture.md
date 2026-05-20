# Architecture — Foundation + OPFF Baseline

Task: `task-2026-05-20-002`
Scope: Issue #1 Phase 1 + Phase 2

## 1. 컴포넌트 다이어그램

```
┌──────────────────────────────┐
│ GitHub Actions monthly cron  │  .github/workflows/monthly_import.yml
│   (0 18 1 * *)               │
└──────────┬───────────────────┘
           │ runs
           ▼
┌──────────────────────────────┐
│ scripts/import_opff.py       │  python entrypoint
│  ├─ fetch_dump()             │  Open Pet Food Facts JSONL.gz
│  ├─ stream_filter()          │  cat-food + non-KR
│  ├─ normalize.to_rows()      │  unit normalize
│  └─ supabase_upsert()        │  service_role client
└──────────┬─────────┬─────────┘
           │         │
   raw .gz │         │ rows
           ▼         ▼
┌──────────────┐  ┌───────────────────────────────┐
│ Supabase     │  │ Supabase Postgres             │
│ Storage      │  │  brand / product / nutriment  │
│ raw-snapshots│  │  ingredient / snapshot_history│
│ (private)    │  │  scrape_run                   │
└──────────────┘  │  + RLS + PostgREST            │
                  └───────────────────────────────┘
                            ▲
                            │ anon SELECT only
                            │
                  ┌─────────┴───────────┐
                  │ external readers    │
                  └─────────────────────┘
```

## 2. 파일 트리 (이번 사이클이 생성/수정)

```
.
├── README.md                              # 갱신 (Setup/Run/Compliance/ODBL)
├── .gitignore                             # new
├── .env.example                           # new
├── pyproject.toml                         # new (poetry or uv)
├── Makefile                               # new
├── config/
│   └── compliance.yaml                    # new (UA, contact, rate limits)
├── supabase/
│   ├── config.toml                        # new (supabase CLI)
│   ├── migrations/
│   │   ├── 20260520000001_init_schema.sql # new
│   │   ├── 20260520000002_rls_policies.sql# new
│   │   └── 20260520000003_views.sql       # new (v_korea_leak_check, v_field_completeness)
│   └── seed.sql                           # new (dev sample)
├── scripts/
│   ├── __init__.py
│   ├── import_opff.py                     # new (entrypoint)
│   ├── opff_client.py                     # new (dump fetch + stream parse)
│   ├── normalize.py                       # new (unit + field mapping)
│   ├── supabase_client.py                 # new (thin wrapper)
│   └── compliance.py                      # new (UA loader)
├── tests/
│   ├── __init__.py
│   ├── test_normalize.py                  # new
│   ├── test_filter.py                     # new (korea exclusion)
│   └── fixtures/
│       └── opff_sample.jsonl              # new (10 row sample)
├── .github/
│   └── workflows/
│       ├── ci.yml                         # new (lint + test)
│       └── monthly_import.yml             # new (cron)
└── _loopd/task-2026-05-20-002/
    ├── prd.md
    ├── architecture.md
    └── plan.md
```

## 3. 데이터 흐름

1. **Trigger** — cron(`0 18 1 * *`) 또는 `workflow_dispatch` 가 `monthly_import.yml` 실행.
2. **Fetch** — `opff_client.fetch_dump()` 가 `https://static.openfoodfacts.org/data/openpetfoodfacts-products.jsonl.gz` 를 streaming 다운로드. ETag 저장.
3. **Snapshot** — 원본을 `raw-snapshots/opff/{YYYY-MM-DD}/openpetfoodfacts-products.jsonl.gz` 로 Storage 업로드 (멱등: 동일 ETag 면 skip).
4. **Stream parse** — `gzip.open()` + `ijson.items()` 로 한 줄씩 dict 생성. 메모리 상수.
5. **Filter** — `categories_tags` 에 `en:cat-food` 포함 AND `countries_tags` 에 `en:south-korea` 미포함.
6. **Normalize** — `normalize.to_rows(item)` 가 4-tuple `(brand_row, product_row, nutriment_row, ingredient_rows)` 반환. 단위 환산 + standard 추정.
7. **Upsert** — 배치(500 row) 단위로 `supabase_client.upsert_*()` 호출. 순서: brand → product → nutriment → ingredient.
8. **Audit** — 시작/종료/카운트를 `scrape_run` 1행으로 기록.
9. **Verify** — `v_korea_leak_check` 결과 row > 0 이면 workflow 실패 종료.

## 4. 데이터 모델 상세

### 4.1 brand
```sql
create table brand (
  id            bigserial primary key,
  name          text not null,
  parent_company text,
  hq_country    text,
  unique (name, coalesce(parent_company, ''))
);
```

### 4.2 product
```sql
create table product (
  id             bigserial primary key,
  barcode        text unique,
  brand_id       bigint references brand(id),
  product_name   text not null,
  product_type   text not null default 'cat_food'
                 check (product_type = 'cat_food'),
  life_stage     text,
  form           text check (form in ('dry','wet','treat','raw','other') or form is null),
  source_url     text not null,
  source_country text,
  fetched_at     timestamptz not null default now()
);
create index on product(brand_id);
create index on product(source_country);
```

### 4.3 nutriment
```sql
create table nutriment (
  product_id           bigint references product(id) on delete cascade,
  fetched_at           timestamptz not null,
  protein_pct          numeric,
  fat_pct              numeric,
  fiber_pct            numeric,
  moisture_pct         numeric,
  ash_pct              numeric,
  taurine_mg_per_kg    numeric,
  energy_kcal_per_100g numeric,
  standard             text check (standard in ('AAFCO','FEDIAF','other')),
  raw_json             jsonb not null,
  primary key (product_id, fetched_at)
);
```

### 4.4 ingredient
```sql
create table ingredient (
  product_id     bigint references product(id) on delete cascade,
  position       int not null,
  name_original  text not null,
  name_en        text,
  allergen_flag  boolean default false,
  primary key (product_id, position)
);
```

### 4.5 snapshot_history
```sql
create table snapshot_history (
  id          bigserial primary key,
  product_id  bigint references product(id) on delete cascade,
  diff        jsonb not null,
  fetched_at  timestamptz not null default now()
);
create index on snapshot_history(product_id, fetched_at desc);
```

### 4.6 scrape_run
```sql
create table scrape_run (
  id              bigserial primary key,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  source          text not null,             -- 'opff' | 'royal_canin' | ...
  status          text not null check (status in ('running','success','failed')),
  rows_upserted   int default 0,
  rows_skipped    int default 0,
  error           text
);
```

## 5. RLS 정책

```sql
alter table brand, product, nutriment, ingredient, snapshot_history enable row level security;

-- anon read-only
create policy "anon read brand"          on brand          for select to anon using (true);
create policy "anon read product"        on product        for select to anon using (true);
create policy "anon read nutriment"      on nutriment      for select to anon using (true);
create policy "anon read ingredient"     on ingredient     for select to anon using (true);
create policy "anon read history"        on snapshot_history for select to anon using (true);

-- scrape_run: anon 차단 (정책 없음 = 거부)
alter table scrape_run enable row level security;

-- service_role 은 RLS 우회 (Supabase 기본)
```

## 6. 외부 의존성

| Library | Purpose | Version pin |
|---|---|---|
| `supabase` (python) | service_role client | ^2.0 |
| `ijson` | streaming JSON parser | ^3.2 |
| `pyyaml` | config loader | ^6.0 |
| `httpx` | dump 다운로드 | ^0.27 |
| `pytest` | tests | ^8.0 |
| `pytest-asyncio` | async tests | ^0.23 |
| `ruff` | lint | latest |

OS 도구: `supabase` CLI (로컬 dev).

## 7. 시크릿 / 환경변수

`.env.example` 에 명시 (실제 값은 GitHub Actions secrets + 로컬 `.env`):

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_jwt>
SUPABASE_ANON_KEY=<anon_jwt>
CONTACT_EMAIL=hongbbol@example.com
OPFF_DUMP_URL=https://static.openfoodfacts.org/data/openpetfoodfacts-products.jsonl.gz
RUN_MODE=full   # or 'sample' for dev
SAMPLE_LIMIT=50
```

## 8. 컴플라이언스 설정 형식

`config/compliance.yaml`:
```yaml
user_agent: "nnenn1-cat-food-collector/0.1 (+mailto:${CONTACT_EMAIL})"
contact_email: "${CONTACT_EMAIL}"
sources:
  opff:
    rate_limit:
      read_per_min: 15
      search_per_min: 10
    attribution: "Open Pet Food Facts — ODBL"
    license_url: "https://opendatacommons.org/licenses/odbl/1-0/"
```

## 9. 에러 처리 & 로깅

- 모든 함수는 구조화된 로깅(`logging.basicConfig(format='%(asctime)s %(levelname)s %(name)s %(message)s')`)
- `import_opff.py` 는 try/except 로 전체 감싸고, 실패 시 `scrape_run.status = 'failed'`, error 메시지 저장 후 `sys.exit(1)`.
- Supabase upsert 가 500 row 배치에서 실패하면 해당 배치 retry 3회 (`exponential backoff` 2s/4s/8s).

## 10. 테스트 전략

- **unit**: `tests/test_normalize.py` — OPFF sample dict → expected row dict 변환 검증.
- **filter**: `tests/test_filter.py` — `countries_tags` 에 `en:south-korea` 가 있으면 skip, `en:cat-food` 가 없어도 skip.
- **fixture**: `tests/fixtures/opff_sample.jsonl` — 10 row (정상 8 / KR 1 / non-cat-food 1).
- **integration**: 로컬 `supabase start` 환경에서 `make seed` 후 row 수 assertion.

## 11. CI/CD

- `ci.yml` (push, pr): `ruff check . && pytest -q`
- `monthly_import.yml` (cron, workflow_dispatch):
  - python 3.12 setup
  - install deps
  - run `python scripts/import_opff.py`
  - upload `scrape_run.log` as artifact
  - fail if exit code != 0

## 12. 추후 확장 지점 (이번 phase 가 막지 않도록 설계)

- `scripts/sources/` 디렉토리로 OPFF 외 source(royal_canin, hills…)를 plugin 형태로 추가할 수 있게 인터페이스를 `BaseSource` 추상화 (이번 phase 는 OPFF 하나지만 모듈 분리만 해두면 됨).
- `snapshot_history` 테이블은 이번 phase 에서 생성만 하고 채우지 않음. Phase 5 에서 diff 로직 추가.
- `standard` 추정은 source_country → AAFCO(US/CA/MX) / FEDIAF(EU) 단순 룩업으로 시작, 추후 정교화.
