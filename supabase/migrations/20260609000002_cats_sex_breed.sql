-- ─── 프로필에 성별·묘종 추가 ──────────────────────────────────
-- 마이페이지 프로필에 성별(여아/남아)과 묘종을 표시하기 위한 컬럼.
-- 기존 행이 있으므로 nullable 로 추가(앱 온보딩 스키마에서 필수로 강제하고,
-- 기존 프로필은 수정·저장 시 입력하게 된다). 추천 엔진은 사용하지 않는 표시·저장용.

alter table public.cats add column if not exists sex text check (sex in ('여아','남아'));
alter table public.cats add column if not exists breed text;
