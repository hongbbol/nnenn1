-- ============================================================================
-- 원격 foods 테이블: 한국 유통 게이트 + 미네랄 레버 컬럼 (2026-06-24)
-- ----------------------------------------------------------------------------
-- 적용법: Supabase Studio → SQL Editor → 이 파일 전체 붙여넣기 → Run.
-- (migrations/20260624000001_foods_kr_minerals.sql 과 동일 내용 + 검증 쿼리.
--  로컬 CLI 미링크 환경이라 Studio 수동 적용 — 과거 apply_*.sql 관행.)
-- 적용 후: 로컬에서 `node scripts/etl/seed-foods.mjs` 실행해 1333 SKU 업서트.
-- ============================================================================

alter table public.foods
  add column if not exists kr_available  boolean not null default false,
  add column if not exists potassium_pct numeric(4,2),
  add column if not exists chloride_pct  numeric(4,2),
  add column if not exists taurine_pct   numeric(4,2),
  add column if not exists epa_dha_pct   numeric(4,2);

comment on column public.foods.kr_available is
  '한국 정식 유통 여부 — 02_Brands.kr_distributed=Yes AND 03_Lines.kr_line_available=Yes. 추천 하드 게이트.';
comment on column public.foods.epa_dha_pct is
  'EPA+DHA 합산 as-fed % (총 omega3와 분리 — 고양이는 ALA→EPA/DHA 전환 불가).';

create index if not exists foods_kr_active_idx
  on public.foods(kr_available) where active;

-- ── 검증: 컬럼 5개가 보이면 성공 ──────────────────────────────
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'foods'
  and column_name in ('kr_available','potassium_pct','chloride_pct','taurine_pct','epa_dha_pct')
order by column_name;
