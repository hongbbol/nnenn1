-- foods 공개 읽기 차단 (2026-10-27)
--
-- 배경: 20260607000001_foods.sql의 "foods_public_read" 정책은 anon/authenticated에게
-- active 행 전체(전 컬럼)를 열어 두었다. anon 키는 브라우저 번들에 포함되므로
-- REST 요청 한 번으로 검증된 데이터셋 전량(원료·성분·미네랄·제조원·KR 유통)을 받아갈 수 있었다.
--
-- 조치: 앱은 src/lib/data/queries.ts(server-only)에서 service_role로만 foods를 읽도록 바꿨다
-- (getRecommendationFoods / getFoodOptionRows / getFoodById). 클라이언트는 foods를 직접 읽지 않는다.
-- 쓰기는 원래부터 service_role 전용(ETL seed-foods.mjs).
--
-- ⚠ 적용 순서: 이 마이그레이션은 queries.ts 변경이 배포된 **뒤에** 실행한다.
--   먼저 실행하면 구 코드(anon 세션 읽기)가 0행을 받아 추천이 시드 폴백으로 떨어진다.
--
-- FK(cats.current_food_id → foods.id) 검사는 RLS를 타지 않으므로 영향 없다.

drop policy if exists "foods_public_read" on public.foods;

-- RLS는 유지(정책 0개 → anon/authenticated SELECT 결과 0행). 여기에 더해 테이블 권한 자체를 회수해
-- 우회 시도가 "빈 결과"가 아니라 42501(permission denied)로 드러나게 한다.
revoke select on table public.foods from anon, authenticated;
