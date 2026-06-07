-- 출생일을 년/월/일 단위로 수집하도록 cats에 birth_month·birth_day 추가.
-- 기존 행 호환을 위해 nullable로 두되 범위 체크를 건다. 신규 온보딩은 항상 채워서 insert.
alter table public.cats
  add column if not exists birth_month smallint
    check (birth_month between 1 and 12),
  add column if not exists birth_day smallint
    check (birth_day between 1 and 31);

comment on column public.cats.birth_month is '출생 월 (1-12). 온보딩 기본정보에서 수집.';
comment on column public.cats.birth_day is '출생 일 (1-31). 온보딩 기본정보에서 수집.';
