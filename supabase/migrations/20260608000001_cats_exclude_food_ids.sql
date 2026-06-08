-- ─── cats.exclude_food_ids ──────────────────────────────────
-- 온보딩 식단 입력의 '제외하고 싶은 사료' — 추천에서 하드 제외할 사료 id 목록.
-- SEED_FOODS의 문자열 id를 그대로 저장(엔진은 인메모리 SEED_FOODS로 동작 → FK 아님).

alter table public.cats
  add column if not exists exclude_food_ids text[] not null default '{}';
