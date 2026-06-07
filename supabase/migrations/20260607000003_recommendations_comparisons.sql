-- ─── 추천 히스토리 + 비교 히스토리 (마이페이지 M4) ──────────
-- 추천 결과는 그동안 저장되지 않고 매번 재계산만 했다. 마이페이지에서
-- "최근 추천 3개"와 "비교 히스토리"를 보여주기 위해 두 테이블을 추가한다.
-- 최근 3개 prune은 앱 레이어(_actions.ts)에서 처리한다.

-- ─── cats.current_food_id FK (M2에서 미뤘던 것) ──────────────
-- foods 테이블이 이제 존재하므로 FK를 건다. 비교 baseline 정합성 보장.
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
  top_food_ids text[] not null default '{}',            -- 요약: 추천 상위 사료
  summary      jsonb not null default '{}'::jsonb,      -- 표시용(사료명/점수/모드)
  result       jsonb not null,                          -- RecResult 전체 직렬화
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
  baseline_text      text,                              -- 자유입력 사료명(영양 데이터 없음)
  candidate_food_ids text[] not null default '{}',
  result             jsonb not null,                    -- ComparisonResult 직렬화
  created_at         timestamptz default now()
);

create index if not exists comparisons_user_created_idx
  on public.comparisons(user_id, created_at desc);

alter table public.comparisons enable row level security;

drop policy if exists "comparisons_owner_all" on public.comparisons;
create policy "comparisons_owner_all" on public.comparisons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
