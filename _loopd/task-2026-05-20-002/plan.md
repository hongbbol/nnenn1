# Implementation Plan — Foundation + OPFF Baseline

Task: `task-2026-05-20-002`
Branch: `loopd/task-2026-05-20-002`

Implementation 서브에이전트는 이 목록을 순서대로 실행한다. 각 step 은 자기완결적이며 끝에 검증 명령이 포함되어 있다.

---

## Step 0. Pre-flight

- [ ] `cd /Users/bboal/.loopd/workspaces/task-2026-05-20-002--hongbbol__nnenn1`
- [ ] `git status` 가 clean 한지 확인 (현재 README 만 존재).
- [ ] 모든 신규 파일은 워크스페이스 안에서만 생성한다.

## Step 1. Project skeleton

- [ ] `.gitignore` 작성 — `.env`, `__pycache__/`, `.venv/`, `dist/`, `*.pyc`, `.ruff_cache/`, `.pytest_cache/`, `node_modules/`, `supabase/.temp/`.
- [ ] `.env.example` 작성 — architecture.md §7 의 키 목록.
- [ ] `pyproject.toml` 작성 — python ^3.12, deps: supabase, ijson, pyyaml, httpx, python-dotenv, [dev] pytest, pytest-asyncio, ruff. ruff 설정(line-length=100, target=py312).
- [ ] `Makefile` 작성 — `install`, `lint`, `test`, `seed`, `import-sample`, `supabase-up`, `supabase-down` 타깃.
- [ ] `mkdir -p config scripts tests/fixtures supabase/migrations .github/workflows`
- [ ] **검증**: `ls -R` 으로 트리 출력, architecture.md §2 와 비교.

## Step 2. Compliance config

- [ ] `config/compliance.yaml` 작성 — architecture.md §8 그대로.
- [ ] `scripts/compliance.py` — `load()` 함수: yaml 로드 + `${VAR}` 치환 (간단한 `os.path.expandvars` 또는 정규식). 반환 dataclass `ComplianceConfig(user_agent, contact_email, sources: dict)`.
- [ ] **검증**: `python -c "from scripts.compliance import load; print(load())"` 정상 출력.

## Step 3. Supabase migrations

- [ ] `supabase/config.toml` — 기본 `supabase init` 결과 포함 (project_id 만 placeholder).
- [ ] `supabase/migrations/20260520000001_init_schema.sql` — architecture.md §4 의 6개 table CREATE + 인덱스.
- [ ] `supabase/migrations/20260520000002_rls_policies.sql` — architecture.md §5 의 RLS 정책.
- [ ] `supabase/migrations/20260520000003_views.sql`:
  - `v_korea_leak_check` — `product` 에서 `source_country = 'KR'` OR `source_url ILIKE '%.kr%'` row 반환.
  - `v_field_completeness` — protein/fat/fiber/moisture NULL 비율을 백분율로 집계.
- [ ] `supabase/seed.sql` — dev 용 brand 1행 + product 2행(샘플).
- [ ] **검증**: SQL 문법은 `supabase db lint`(있다면) 또는 로컬 `psql -f` dry-run. 로컬 supabase 가 없으면 syntax check 만 (sqlfluff or manual eyeball).

## Step 4. Storage 정책 (코드만)

- [ ] `supabase/migrations/20260520000004_storage_bucket.sql` — `raw-snapshots` 버킷 INSERT + private 정책.
  ```sql
  insert into storage.buckets (id, name, public) values ('raw-snapshots','raw-snapshots', false)
  on conflict (id) do nothing;
  ```
- [ ] **검증**: 파일 존재 + SQL 구문.

## Step 5. OPFF 클라이언트

- [ ] `scripts/opff_client.py`:
  - `fetch_dump(url, dest_path, user_agent) -> Path` — httpx streaming, chunk 1MB, ETag 헤더 저장.
  - `stream_items(path) -> Iterator[dict]` — `gzip.open(path)` 한 줄 단위, 각 줄 `json.loads()`.
  - 진행도 로깅: 매 10,000 row 마다 `INFO`.
- [ ] **검증**: `tests/fixtures/opff_sample.jsonl` 만들고 `stream_items` 가 10개 dict 반환하는지 unit test.

## Step 6. Normalize 모듈

- [ ] `scripts/normalize.py`:
  - `to_brand(item) -> dict` — `brands` 필드 첫번째 토큰.
  - `to_product(item) -> dict` — barcode, name, life_stage(`life_stage` or 추정), form(category_tags 에서 `dry`/`wet` 추론), source_url, source_country (countries_tags 첫번째 non-KR), fetched_at=`utcnow()`.
  - `to_nutriment(item) -> dict` — `nutriments.proteins_100g` 등을 직접 매핑. 단위는 OPFF 가 이미 `g/100g` 이므로 대부분 통과. energy 는 `kcal_100g` 우선.
  - `to_ingredients(item) -> list[dict]` — `ingredients` 배열의 `text`, `id` 활용 (`id` 가 `en:` prefix 면 name_en).
  - `is_cat_food(item) -> bool` / `is_korea(item) -> bool` 헬퍼.
  - `infer_standard(source_country) -> str` — US/CA/MX → 'AAFCO', EU 27개국 → 'FEDIAF', else 'other'.
- [ ] **검증**: `tests/test_normalize.py` 가 fixture sample 의 8/10 row 가 cat_food+non-KR 임을 확인.

## Step 7. Supabase upsert 래퍼

- [ ] `scripts/supabase_client.py`:
  - `client_from_env() -> Client` — supabase-py with `SUPABASE_URL` + service_role key.
  - `upsert_brand(client, row) -> int` (returning id, dedup by name+parent).
  - `upsert_product(client, row) -> int` (barcode unique).
  - `upsert_nutriment(client, row) -> None`.
  - `upsert_ingredients(client, product_id, rows) -> None` (delete-then-insert by product_id 로 단순화).
  - 모든 함수는 `tenacity` retry 또는 수동 backoff 3회.
- [ ] **검증**: 모듈 import 가능, 실제 호출은 import_opff 통합 테스트에서.

## Step 8. import_opff.py entrypoint

- [ ] `scripts/import_opff.py`:
  - argparse: `--sample N`, `--dry-run`, `--skip-download`.
  - 흐름:
    1. `compliance = load_compliance()`
    2. `client = client_from_env()`
    3. `run_id = start_scrape_run(client, source='opff')`
    4. dump fetch (sample 모드면 fixture 사용)
    5. for item in stream_items: filter → normalize → upsert (배치 500).
    6. `finish_scrape_run(client, run_id, status='success', rows=...)`
    7. `verify_korea_leak(client)` — view row > 0 이면 raise.
  - 에러 시 `scrape_run.status='failed'`, error trace 저장, exit 1.
- [ ] **검증**: `python scripts/import_opff.py --sample 10 --dry-run` 이 정상 종료 (실제 supabase 호출 없이 normalize 까지만).

## Step 9. Tests

- [ ] `tests/fixtures/opff_sample.jsonl` — 10 라인:
  - 8 라인: `categories_tags=["en:cat-food"]`, `countries_tags=["en:united-states"]`, 정상 nutriments.
  - 1 라인: KR (`en:south-korea`) 포함.
  - 1 라인: cat-food 가 아닌 `en:dog-food`.
- [ ] `tests/test_filter.py` — `is_cat_food`, `is_korea` true/false 케이스.
- [ ] `tests/test_normalize.py` — to_product/to_nutriment 출력 검증.
- [ ] **검증**: `pytest -q` 모두 통과.

## Step 10. GitHub Actions

- [ ] `.github/workflows/ci.yml`:
  - on push/PR
  - python 3.12 setup, `pip install -e .[dev]`, `ruff check .`, `pytest -q`.
- [ ] `.github/workflows/monthly_import.yml`:
  - on `schedule: - cron: "0 18 1 * *"` and `workflow_dispatch`.
  - env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CONTACT_EMAIL` from secrets.
  - run `python scripts/import_opff.py` (full mode).
  - upload logs as artifact.
- [ ] **검증**: workflow yaml syntax (`yamllint` or VS code).

## Step 11. README 갱신

- [ ] `README.md` 섹션:
  1. **What** — 한 문단 (Issue #1 요약).
  2. **Setup** — `cp .env.example .env`, `pip install -e .[dev]`, `supabase start`, `supabase db push`.
  3. **Run** — `make import-sample`, `make test`.
  4. **Schedule** — 매월 1일 18:00 UTC GitHub Actions.
  5. **Compliance** — ODBL attribution, User-Agent, contact email.
  6. **License** — TBD (이번엔 placeholder).
- [ ] **검증**: 마크다운 렌더 미리보기 (시각만 OK).

## Step 12. Lint & Test 전체 통과

- [ ] `make lint` (ruff) — 0 error.
- [ ] `make test` (pytest) — all pass.
- [ ] **검증**: 두 명령 모두 exit 0.

## Step 13. Commit

- [ ] `git add` (구체 파일들 — `-A` 금지).
- [ ] `git commit -m "feat: foundation + OPFF baseline import pipeline"` (Implementation 단계 commit; planning commit 은 별도).
- [ ] `git log --oneline -3` 으로 확인.

---

## 검증 체크리스트 (Implementation 종료 직전)

- [ ] AC-1 ~ AC-7 (prd.md §6) 모두 그린.
- [ ] `v_korea_leak_check` SQL 이 빈 결과 반환 (sample import 후).
- [ ] `make lint && make test` 둘 다 통과.
- [ ] 시크릿이 코드/로그에 없다 (`grep -r "service_role" scripts/` 가 환경변수 이름만 매치).
- [ ] README ODBL attribution 존재 (`grep -i "ODBL" README.md`).

## 위험 & 완화

| Risk | Impact | Mitigation |
|---|---|---|
| 실제 Supabase 프로젝트가 없어 `db push` 검증 불가 | medium | migration SQL 을 로컬 postgres docker 로 dry-run 하거나 syntax 만 검증. README 에 수동 절차 명시. |
| OPFF dump URL 변경 | low | `.env.example` 에 URL 노출 + compliance.yaml 에 source 메타. |
| supabase-py API 변경 | low | `supabase>=2,<3` 핀. |
| 9 GB dump 다운로드가 sample 모드 외엔 무거움 | medium | streaming + skip-download flag. CI 에선 fixture 만. |
| Ingredient 다국어 매핑 부정확 | accepted | Phase 4 에서 고도화. 이번엔 OPFF `en:` prefix 만 활용. |

## Implementation 종료 신호

- 모든 Step 체크박스 완료.
- `git log` 에 1개 이상의 feature commit.
- 다음 phase 가 받아갈 artifact 목록: `_loopd/task-2026-05-20-002/{prd,architecture,plan}.md` + 소스 코드.
