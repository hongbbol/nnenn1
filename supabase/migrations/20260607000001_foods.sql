-- ─── foods 테이블 (M2 사료 DB) ──────────────────────────────
-- dev-plan.md §3.2 / GH 이슈 #16 트랙 B
-- nnenn2 리서치 데이터(cat_food_research.xlsx)를 평탄화해 시드.
-- 관리: service_role(ETL/Studio)만 쓰기, 공개는 active=true 읽기.

create table if not exists public.foods (
  id                  uuid primary key default gen_random_uuid(),
  brand               text not null,
  product_name        text not null,
  category            text not null check (category in ('건식','습식')),
  age_fit             text[] not null,   -- ['1+','7+','11+','15+'] 부분집합
  condition_fit       text[] not null,   -- 3.3 건강상태 enum 값들
  protein_pct         numeric(4,1),
  fat_pct             numeric(4,1),
  fiber_pct           numeric(4,1),
  ash_pct             numeric(4,1),
  moisture_pct        numeric(4,1),
  phosphorus_pct      numeric(4,2),
  sodium_pct          numeric(4,2),
  omega3_pct          numeric(4,2),
  kcal_per_100g       numeric(5,1),
  ingredient_summary  text,
  ingredient_keywords text[],  -- 정규화된 원료 키워드 — avoid 매칭용
  form                text,
  rec_daily_g         smallint,
  tags                text[],
  image_url           text,
  affiliate_links     jsonb,   -- { coupang: "...", naver: "..." }
  price_per_kg_krw    integer, -- 월 비용 계산용
  active              boolean not null default true,
  -- ── nnenn2 ETL 보강 컬럼 ──
  source_sku_id       text unique,  -- nnenn2 SKU ID (S0001…) — 멱등 업서트 키 / 추적
  food_role           text check (food_role in ('주식','보조식','간식')),  -- 완전성 분류
  life_stage_raw      text,         -- nnenn2 원본 라이프스테이지(키튼/전연령 등 보존)
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists foods_active_age_idx on public.foods(active, age_fit);
create index if not exists foods_conditions_idx on public.foods using gin(condition_fit);
create index if not exists foods_ingredients_idx on public.foods using gin(ingredient_keywords);

-- updated_at 트리거 (touch_updated_at은 init 마이그레이션에서 정의됨)
drop trigger if exists foods_touch_updated_at on public.foods;
create trigger foods_touch_updated_at
  before update on public.foods
  for each row execute function public.touch_updated_at();

-- ─── RLS: 공개 읽기(active만), 쓰기는 service_role 전용 ───────
alter table public.foods enable row level security;

drop policy if exists "foods_public_read" on public.foods;
create policy "foods_public_read" on public.foods
  for select to anon, authenticated
  using (active = true);
-- INSERT/UPDATE/DELETE 정책 없음 → service_role(RLS 우회)만 쓰기 가능.

-- ─── cats.current_food_id → foods(id) FK 연결 ────────────────
-- init 마이그레이션에서 컬럼만 만들고 FK는 foods 생성 후로 미뤘음.
alter table public.cats
  drop constraint if exists cats_current_food_id_fkey;
alter table public.cats
  add constraint cats_current_food_id_fkey
  foreign key (current_food_id) references public.foods(id) on delete set null;
