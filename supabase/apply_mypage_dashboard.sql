-- ============================================================================
-- 마이페이지(M4) — 추천/비교 히스토리 테이블 적용 스크립트
-- ----------------------------------------------------------------------------
-- 용도: Supabase 대시보드 > SQL Editor에 통째로 붙여넣고 Run.
-- 안전: if not exists / drop policy if exists / do$$ 가드로 여러 번 실행 가능(멱등).
-- 정본: supabase/migrations/20260607000003_recommendations_comparisons.sql 과 동일.
-- ============================================================================

-- ─── cats.current_food_id FK (foods 테이블이 이제 존재하므로) ──────────
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cats_current_food_id_fkey'
  ) then
    alter table public.cats
      add constraint cats_current_food_id_fkey
      foreign key (current_food_id) references public.foods(id) on delete set null;
  end if;
end $$;

-- ─── recommendations: 추천 히스토리(최근 3개 표시) ──────────
create table if not exists public.recommendations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  cat_id       uuid not null references public.cats(id) on delete cascade,
  cat_name     text not null,
  -- 사료 식별자는 MVP 시드(SEED_FOODS) 슬러그('renal-wet-01' 등)라 uuid가 아니다.
  top_food_ids text[] not null default '{}',
  summary      jsonb not null default '{}'::jsonb,
  result       jsonb not null,
  created_at   timestamptz default now()
);
create index if not exists recommendations_user_created_idx
  on public.recommendations(user_id, created_at desc);
alter table public.recommendations enable row level security;
drop policy if exists "recommendations_owner_all" on public.recommendations;
create policy "recommendations_owner_all" on public.recommendations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── comparisons: 비교 히스토리 ──────────────────────────────
create table if not exists public.comparisons (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  cat_id             uuid not null references public.cats(id) on delete cascade,
  -- 시드 슬러그를 담을 수 있도록 text(FK 아님). DB foods 전환 시 정합성 재검토.
  baseline_food_id   text,
  baseline_text      text,
  candidate_food_ids text[] not null default '{}',
  result             jsonb not null,
  created_at         timestamptz default now()
);
create index if not exists comparisons_user_created_idx
  on public.comparisons(user_id, created_at desc);
alter table public.comparisons enable row level security;
drop policy if exists "comparisons_owner_all" on public.comparisons;
create policy "comparisons_owner_all" on public.comparisons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── 적용 확인 (선택) ────────────────────────────────────────
-- 아래를 함께 실행하면 두 테이블이 생성됐는지 확인할 수 있다.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('recommendations', 'comparisons')
order by table_name;
