-- ─── foods: 마그네슘·칼슘 (2026-10-20) ──────────────────────────
-- 규칙 레지스트리 §3-B(스트루바이트 Mg 제한 보조 레버)·§3-G(CKD Ca:P ≥1:1 회피 규칙)용.
-- nnenn2 06_Nutrition에 magnesium_pct(458행)·calcium_pct(1,239행)가 이미 수집돼 있었으나
-- ETL이 내보내지 않던 열. build_foods_json.py가 as-fed(+건식 DM 환산)로 채운다.
-- Mg는 0.0x% 수준이라 소수 3자리.

alter table public.foods
  add column if not exists magnesium_pct numeric(5,3),
  add column if not exists calcium_pct   numeric(4,2);

comment on column public.foods.magnesium_pct is
  '마그네슘 as-fed % (소수 3자리). 요로 스트루바이트 보조 레버 — 결측이면 레버 비활성.';
comment on column public.foods.calcium_pct is
  '칼슘 as-fed %. CKD Ca:P 비율 규칙(역비율 회피) — 결측이면 비활성.';
