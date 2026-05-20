-- 20260520000001_init_schema.sql
-- Core tables for global cat food nutrition collection.

create table if not exists brand (
  id              bigserial primary key,
  name            text not null,
  parent_company  text,
  hq_country      text,
  unique (name, coalesce(parent_company, ''))
);

create table if not exists product (
  id             bigserial primary key,
  barcode        text unique,
  brand_id       bigint references brand(id),
  product_name   text not null,
  product_type   text not null default 'cat_food'
                 check (product_type = 'cat_food'),
  life_stage     text,
  form           text check (form in ('dry','wet','treat','raw','other') or form is null),
  source_url     text not null,
  source_country text,
  fetched_at     timestamptz not null default now()
);
create index if not exists idx_product_brand_id on product(brand_id);
create index if not exists idx_product_source_country on product(source_country);

create table if not exists nutriment (
  product_id           bigint references product(id) on delete cascade,
  fetched_at           timestamptz not null,
  protein_pct          numeric,
  fat_pct              numeric,
  fiber_pct            numeric,
  moisture_pct         numeric,
  ash_pct              numeric,
  taurine_mg_per_kg    numeric,
  energy_kcal_per_100g numeric,
  standard             text check (standard in ('AAFCO','FEDIAF','other')),
  raw_json             jsonb not null,
  primary key (product_id, fetched_at)
);

create table if not exists ingredient (
  product_id     bigint references product(id) on delete cascade,
  position       int not null,
  name_original  text not null,
  name_en        text,
  allergen_flag  boolean default false,
  primary key (product_id, position)
);

create table if not exists snapshot_history (
  id          bigserial primary key,
  product_id  bigint references product(id) on delete cascade,
  diff        jsonb not null,
  fetched_at  timestamptz not null default now()
);
create index if not exists idx_snapshot_history_product_fetched
  on snapshot_history(product_id, fetched_at desc);

create table if not exists scrape_run (
  id              bigserial primary key,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  source          text not null,
  status          text not null check (status in ('running','success','failed')),
  rows_upserted   int default 0,
  rows_skipped    int default 0,
  error           text
);
create index if not exists idx_scrape_run_source_started
  on scrape_run(source, started_at desc);
