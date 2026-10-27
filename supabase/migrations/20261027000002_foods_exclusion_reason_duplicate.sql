-- foods.exclusion_reason 허용값에 duplicate_listing 추가 (2026-10-27)
--
-- 배경: 공식 사이트가 같은 제품을 슬러그 둘로 올려 nnenn2 04_SKUs에 두 번 등재된 SKU가 있다
-- (힐스 k/d 반려묘용 건식사료(오션피쉬) S1433/S1434 — 제목·형태·맛·사이즈·DM·kcal·급여·팩샷 동일).
-- 온보딩 사료 검색에 같은 이름이 두 번 뜨던 원인. 중복 쪽은 ETL이 active=false +
-- exclusion_reason='duplicate_listing'으로 내려보낸다(scripts/etl/build_foods_json.py, `[ETL-DUPLICATE-OF:…]` 태그).
--
-- ⚠ 적용 순서: `node scripts/etl/seed-foods.mjs` 업서트 **전에** 실행 — 제약이 구버전이면 S1434 행 업서트가
--   check 위반으로 실패한다.

alter table public.foods drop constraint if exists foods_exclusion_reason_check;
alter table public.foods
  add constraint foods_exclusion_reason_check
  check (exclusion_reason is null
         or exclusion_reason in ('china_made', 'china_hq_presumed', 'duplicate_listing'));

comment on column public.foods.exclusion_reason is
  '추천 제외 사유(관리자용, UI 비노출): china_made = 중국 제조 확인 / china_hq_presumed = 제조국 미확인 + 중국 본사 브랜드 / duplicate_listing = 같은 제품의 중복 등재(원본 SKU만 노출). 값이 있으면 active=false.';
