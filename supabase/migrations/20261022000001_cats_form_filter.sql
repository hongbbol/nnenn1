-- ─── cats: 추천 범위(제형 필터) (2026-10-22) ────────────────────
-- 사용자 결정: 건식만/습식만 하드 필터. "주로 먹는 식단"(diet_type, 현재 급여 형태)과는 별개 질문.
-- 엔진은 '건식만'일 때 수분이 핵심인 모드(요로·CKD 3-4기·당뇨)·감량 목표에서 경고 고지를 낸다.
alter table public.cats
  add column if not exists form_filter text not null default '전체'
    check (form_filter in ('전체', '건식만', '습식만'));

comment on column public.cats.form_filter is
  '추천 범위 — 전체 / 건식만 / 습식만 (하드 필터, 기본 전체).';
