-- ─── 멀티 프로필: 프로필 삭제 시 히스토리 보존 ──────────────────
-- recommendations/comparisons.cat_id 가 cats(id) on delete cascade 라
-- 프로필(고양이)을 삭제하면 추천·비교 히스토리도 함께 삭제됐다.
-- 사용자 요청에 따라 프로필을 지워도 히스토리는 남기고 싶다.
-- → cat_id 를 nullable 로 바꾸고 FK 를 on delete set null 로 재생성한다.
--   (cat_name 은 이미 저장돼 있어 삭제 후에도 마이페이지 히스토리에서 이름 표시 가능)

-- recommendations
alter table public.recommendations alter column cat_id drop not null;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'recommendations_cat_id_fkey'
  ) then
    alter table public.recommendations drop constraint recommendations_cat_id_fkey;
  end if;
end $$;

alter table public.recommendations
  add constraint recommendations_cat_id_fkey
  foreign key (cat_id) references public.cats(id) on delete set null;

-- comparisons
alter table public.comparisons alter column cat_id drop not null;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'comparisons_cat_id_fkey'
  ) then
    alter table public.comparisons drop constraint comparisons_cat_id_fkey;
  end if;
end $$;

alter table public.comparisons
  add constraint comparisons_cat_id_fkey
  foreign key (cat_id) references public.cats(id) on delete set null;
