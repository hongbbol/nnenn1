# PRD — Global Cat Food Nutrition Data Collection System

Issue: hongbbol/nnenn1#1
Task: `task-2026-05-20-002`
Branch: `loopd/task-2026-05-20-002`
Date: 2026-05-20

## 1. 배경 & 문제 정의

전세계 고양이 사료의 영양 데이터를 월 1회 자동 수집·정규화·저장하는 시스템이 필요하다. 한국 유통판은 표기가 변동되므로 **해외 공식 도메인 / 글로벌 오픈 데이터**만 수집한다. 첫 마일스톤은 Open Pet Food Facts(ODBL) 야간 dump 를 baseline 으로 Supabase Postgres 에 적재하는 것이다.

## 2. Scope — 이번 Iteration (Foundation + OPFF Baseline)

이번 planning/implementation 사이클이 다루는 범위:

- Phase 1 (Foundation): 리포지토리 스켈레톤, Supabase 스키마 마이그레이션, Storage 버킷 정의, RLS 정책 초안, 로컬 dev 부팅 스크립트
- Phase 2 (OPFF Baseline): Open Pet Food Facts JSONL dump 다운로드 + cat-food 필터 + 한국 제외 + Supabase upsert 스크립트, GitHub Actions 월간 cron
- 관찰성: `scrape_run` 테이블 + 한국 도메인 누출 0건 모니터 SQL view
- 컴플라이언스: User-Agent, contact email, rate limit 설정 파일

이번 사이클 **밖** (별도 task 로 이관):
- Phase 3 Big4 브랜드 공식 도메인 Crawlee 크롤러
- Phase 4 정교한 다국어 ingredient 매핑
- Phase 5 change detection diff UI
- Phase 6 외부 대시보드

## 3. Functional Requirements

### FR-1. Supabase 데이터 모델
- `brand`, `product`, `nutriment`, `ingredient`, `snapshot_history`, `scrape_run` 6개 테이블을 `supabase/migrations/*.sql` 로 선언.
- `product.barcode` UNIQUE 인덱스, `nutriment(product_id, fetched_at)` 복합 PK.
- `nutriment.raw_json` 은 `jsonb`, `nutriment.standard` 는 `text CHECK IN ('AAFCO','FEDIAF','other')`.

### FR-2. Storage 버킷 규약
- `raw-snapshots` private 버킷. `opff/{YYYY-MM-DD}/openpetfoodfacts-products.jsonl.gz` prefix 로 원본 dump 보관.
- 객체는 immutable (덮어쓰기 금지). 동일 날짜 재실행은 `-rerun-{n}` suffix.

### FR-3. RLS 정책
- `anon` 키: 모든 6개 테이블에 대해 `SELECT` 만 허용.
- `service_role` 키: 모든 쓰기 허용 (스크래퍼가 사용).
- `scrape_run` 은 anon 에 노출하지 않음 (별도 정책 또는 schema).

### FR-4. OPFF baseline import 스크립트
- `scripts/import_opff.py` (또는 TS) — JSONL dump 를 다운로드 → cat-food 필터 → 한국 제외 → 정규화 → upsert.
- 필터 조건:
  - `categories_tags` 에 `en:cat-food` 포함
  - `countries_tags` 에 `en:south-korea` **불포함**
  - source 도메인 화이트리스트는 추후 확장 (Phase 3); 이번 phase 는 OPFF source_url 만 신뢰
- 멱등성: `product.barcode` 기준 upsert, `nutriment` 는 `(product_id, fetched_at)` 기준 upsert.

### FR-5. 단위 정규화 (최소셋)
- 영양 수치는 모두 `g/100g` 또는 `mg/kg`, 에너지는 `kcal/100g` 로 저장.
- OPFF 원시 키 → 표준 컬럼 매핑 테이블 한 곳(`scripts/normalize.py`) 에 모음.
- 환산 불가/누락 필드는 `NULL` + `raw_json` 안에 원본 보존.

### FR-6. 월간 스케줄러
- GitHub Actions workflow `.github/workflows/monthly_import.yml`:
  - cron: `0 18 1 * *` (매월 1일 18:00 UTC)
  - secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CONTACT_EMAIL`
  - python `import_opff.py` 실행 → 성공/실패 종료 코드
- 수동 트리거(`workflow_dispatch`) 지원.

### FR-7. 관찰성
- `scrape_run(id, started_at, finished_at, source, status, rows_upserted, rows_skipped, error)` 테이블에 매 실행 1행 기록.
- SQL view `v_korea_leak_check` — `source_country = 'KR'` 이거나 `source_url` 이 `.kr` 인 row count. **0 이어야 한다.**
- SQL view `v_field_completeness` — 핵심 필드(protein/fat/fiber/moisture) 누락률.

### FR-8. 컴플라이언스 설정
- `config/compliance.yaml` — User-Agent string, contact email, rate limits (`opff`: 15 req/min read, 10 req/min search).
- 스크래퍼는 부팅 시 이 파일을 로드, 모든 HTTP 클라이언트가 이 UA 를 강제 사용.

## 4. Non-Functional Requirements

- **NFR-1 (정확성)**: 환각/추정값 금지. 모든 영양 수치는 OPFF 가 가진 `source_url` 을 그대로 `product.source_url` 에 보존.
- **NFR-2 (멱등성)**: 동일 dump 로 import 를 두 번 실행해도 결과 row 수가 변하지 않는다.
- **NFR-3 (성능)**: cat-food 1,479개 + nutriment 1회 import 가 단일 GitHub Actions runner(2 vCPU, 7 GB) 에서 10분 내 완료.
- **NFR-4 (재현성)**: `requirements.txt` 또는 `pyproject.toml` lock + `supabase/migrations` 순차 SQL 로 깨끗한 환경에서 동일 결과.
- **NFR-5 (안전)**: `service_role` 키는 절대 코드/로그에 노출 금지. GitHub Actions secrets 만 사용.
- **NFR-6 (법적)**: ODBL attribution 을 `README.md` 와 import 결과 메타데이터에 명시.

## 5. User Stories

- **US-1** (운영자 hongbbol): 매월 1일 자동으로 글로벌 cat food 영양 데이터가 갱신되어 있어야 한다. 실패 시 GitHub Actions UI 또는 issue 알림으로 안다.
- **US-2** (데이터 소비자): Supabase anon 키로 `product` + `nutriment` 를 PostgREST endpoint 로 읽을 수 있다. 쓰기는 불가능하다.
- **US-3** (개발자): `supabase start` 와 `make seed` 로 로컬에서 mini sample(100 product) 을 적재해 테스트할 수 있다.
- **US-4** (감사자): `v_korea_leak_check` 뷰가 항상 0 임을 SQL 한 줄로 확인할 수 있다.

## 6. Acceptance Criteria

1. `supabase db push` 가 깨끗한 프로젝트에서 에러 없이 통과한다.
2. `python scripts/import_opff.py --sample 50` 이 로컬 Supabase 에 50개 cat food product + nutriment 를 적재한다.
3. `SELECT count(*) FROM product` 결과가 50, `SELECT count(*) FROM v_korea_leak_check` 결과가 0.
4. 두 번 연속 실행해도 row 수 동일 (멱등성).
5. GitHub Actions `monthly_import.yml` 이 workflow_dispatch 로 수동 실행되어 성공 상태로 끝난다 (CI 환경에서는 mock supabase URL 사용한 dry-run 모드로도 OK).
6. anon 키로 `INSERT` 시도 시 RLS 가 거부한다 (테스트 SQL 포함).
7. `README.md` 가 Setup / Run / Compliance / ODBL attribution 4개 섹션을 포함한다.

## 7. Out of Scope

- Big4 브랜드 공식 도메인 스크래핑 (Phase 3)
- 다국어 ingredient → 영문 매핑의 고도화 (LLM 보조)
- AAFCO/FEDIAF 기준 자체 ingest
- 외부 대시보드 (Metabase, Grafana)
- Realtime 구독
- Edge Function 기반 트리거 (옵션 B); 이번엔 GitHub Actions(옵션 A) 만 채택

## 8. Open Questions (Implementation 진행 중 결정)

- Q1: Supabase 프로젝트가 아직 실제로 존재하지 않는다 → migration 만 작성하고 실제 push 는 README 절차로 가이드. (CI 는 mock)
- Q2: import 스크립트 언어 — Python 채택 (openfoodfacts-python SDK 활용, ML/parsing 친화).
- Q3: dump 파일 크기 약 9 GB 압축해제 → 스트리밍(`gzip.open()` + `ijson`) 으로 메모리 절약.
