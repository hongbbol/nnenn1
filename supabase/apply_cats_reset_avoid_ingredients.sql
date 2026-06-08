-- ============================================================================
-- 레거시 avoid_ingredients(피하고 싶은 성분) stale 값 정리
-- ----------------------------------------------------------------------------
-- 배경: '피하고 싶은 성분' 입력 UI를 제거했으나, 그 전에 저장된 cats 행에는
--       avoid_ingredients 값이 남아 (1) 마이페이지 프로필에 "OO 제외"로 계속 표시되고
--       (2) 수정/재추천 경로로 추천에 반영될 여지가 있었다.
-- 처리: 컬럼·엔진 알레르겐 로직은 그대로 두고(추후 '알러지' 질환 옵션에서 재사용),
--       기존 행의 값만 비운다.
-- 용도: Supabase 대시보드 > SQL Editor에 붙여넣고 Run. 멱등(여러 번 실행 가능).
-- ============================================================================

update public.cats
set avoid_ingredients = '{}'
where avoid_ingredients is distinct from '{}';

-- ─── 확인(선택) — 남아있는 비어있지 않은 행 수(0이어야 정상) ──────────────
select count(*) as remaining_non_empty
from public.cats
where avoid_ingredients is distinct from '{}';
