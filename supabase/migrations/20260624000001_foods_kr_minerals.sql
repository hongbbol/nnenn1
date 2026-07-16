-- ─── foods: 한국 유통 여부 + 미네랄 레버 컬럼 (2026-06-24) ──────────
-- nnenn2 설계 문서 정합:
--   사료추천_데이터스키마_v1 §유통 — kr_distributed(한국 유통 여부·SKU 매칭).
--   사료추천_데이터스키마_v1 §영양 — 나트륨·칼륨·염소·타우린·EPA+DHA(ALA와 분리).
-- 배경: 서비스 전제가 "한국 구매 가능 사료 추천"인데 foods에 KR 필드가 없어
--   미유통 브랜드(230개)까지 후보에 들어가던 갭을 해소. ETL(build_foods_json.py)이
--   02_Brands.kr_distributed × 03_Lines.kr_line_available 로 도출해 채운다.

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

-- 추천 후보 조회는 항상 active + kr_available 조합이므로 부분 인덱스.
create index if not exists foods_kr_active_idx
  on public.foods(kr_available) where active;
