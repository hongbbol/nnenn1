-- ─── foods: 제조국·제조사 + 추천 제외 사유 (2026-10-20) ──────────
-- 정책(사용자 결정): 중국 제조 사료는 무조건 추천 제외, 관리자는 사유를 볼 수 있어야 한다.
-- ETL(build_foods_json.py)이 nnenn2 04_SKUs.made_in_country / manufacturer / origin_basis와
-- 02_Brands.hq_country로 판정해 채운다. 제외 행은 active=false → 기존 RLS(공개 읽기는 active만)로
-- 일반 사용자에게 보이지 않고, 대시보드(service_role)에서만 exclusion_reason과 함께 보인다.

alter table public.foods
  add column if not exists made_in_country  text,
  add column if not exists manufacturer     text,
  add column if not exists origin_basis     text,
  add column if not exists exclusion_reason text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'foods_exclusion_reason_check') then
    alter table public.foods
      add constraint foods_exclusion_reason_check
      check (exclusion_reason is null or exclusion_reason in ('china_made', 'china_hq_presumed'));
  end if;
end $$;

comment on column public.foods.made_in_country is
  '실제 제조국(한글 정규값, 브랜드 본사 국가 아님). null = 미확인. 중국이면 추천 제외.';
comment on column public.foods.manufacturer is
  '라벨·상품정보고시의 제조자(제조원) 상호 원문.';
comment on column public.foods.origin_basis is
  '제조국·제조사 근거(채널 확인일 URL).';
comment on column public.foods.exclusion_reason is
  '추천 제외 사유(관리자용, UI 비노출): china_made = 중국 제조 확인 / china_hq_presumed = 제조국 미확인 + 중국 본사 브랜드. 값이 있으면 active=false.';

-- 관리자 조회용: 제외 사료 목록
create index if not exists foods_exclusion_idx
  on public.foods(exclusion_reason) where exclusion_reason is not null;
