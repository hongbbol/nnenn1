-- ─── Initial migration: profiles + cats (M1 scope) ──────────
-- dev-plan.md §3.2, §3.4

create extension if not exists "pgcrypto";

-- ─── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  display_name         text,
  marketing_opt_in     boolean default false,
  privacy_consent_at   timestamptz,
  terms_consent_at     timestamptz,
  birth_year           smallint,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── cats ────────────────────────────────────────────────────
create table if not exists public.cats (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade,
  name                text not null,
  birth_year          smallint not null
    check (birth_year between 2000 and extract(year from now())),
  age_group           text generated always as (
    case
      when (extract(year from now()) - birth_year) >= 15 then '15+'
      when (extract(year from now()) - birth_year) >= 11 then '11+'
      when (extract(year from now()) - birth_year) >= 7  then '7+'
      else '1+'
    end
  ) stored,
  age_label           text generated always as (
    case
      when (extract(year from now()) - birth_year) >= 15 then '초고령'
      when (extract(year from now()) - birth_year) >= 11 then '고령'
      when (extract(year from now()) - birth_year) >= 7  then '중년'
      else '성묘'
    end
  ) stored,
  weight_kg           numeric(3,1) not null check (weight_kg between 0.5 and 15),
  neutered_status     text not null check (neutered_status in ('완료','안 함','몰라요')),
  diet_type           text not null check (diet_type in ('건식','습식','혼합')),
  current_food_id     uuid,  -- FK added in M2 once `foods` table exists
  current_food_text   text,
  health_conditions   text[] not null default '{}',
  avoid_ingredients   text[] not null default '{}',
  goal                text not null check (goal in ('질환관리','중노령 전환','체중관리 - 감량','체중관리 - 증량')),
  hero_image_path     text,
  last_recommended_at timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  -- dev-plan.md §3.2: current_food_id (DB에 있는 사료) XOR current_food_text (자유 입력).
  -- 둘 다 null은 허용 (입력 안 함). 둘 다 동시 입력은 금지.
  constraint cats_current_food_either check (
    not (current_food_id is not null and current_food_text is not null)
  )
);

create index if not exists cats_user_id_idx on public.cats(user_id);

alter table public.cats enable row level security;

drop policy if exists "cats_owner_all" on public.cats;
create policy "cats_owner_all" on public.cats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at trigger ----------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists cats_touch_updated_at on public.cats;
create trigger cats_touch_updated_at
  before update on public.cats
  for each row execute function public.touch_updated_at();
