-- ============================================================================
-- 원격 cats 테이블 exclude_food_ids 컬럼 보정
-- ----------------------------------------------------------------------------
-- 증상: 온보딩 저장 시 "Could not find the 'exclude_food_ids' column of 'cats'
--       in the schema cache".
-- 원인: 원격 cats에 '제외하고 싶은 사료'용 exclude_food_ids 컬럼이 아직 없음
--       (마이그레이션 20260608000001 미적용).
-- 용도: Supabase 대시보드 > SQL Editor에 붙여넣고 Run. 멱등(여러 번 실행 가능).
-- ============================================================================

-- 추천에서 하드 제외할 사료 id 목록(SEED_FOODS 문자열 id). FK 아님.
alter table public.cats
  add column if not exists exclude_food_ids text[] not null default '{}';

-- PostgREST 스키마 캐시 즉시 갱신(컬럼 추가 후 'schema cache' 오류 방지)
notify pgrst, 'reload schema';

-- ─── 확인(선택) ──────────────────────────────────────────────
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'cats'
  and column_name = 'exclude_food_ids';
