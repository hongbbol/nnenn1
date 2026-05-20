-- 20260520000002_rls_policies.sql
-- Row-level security: anon can SELECT product/brand/nutriment/ingredient/snapshot_history.
-- scrape_run is RLS-enabled with no anon policy = anon is denied.

alter table brand            enable row level security;
alter table product          enable row level security;
alter table nutriment        enable row level security;
alter table ingredient       enable row level security;
alter table snapshot_history enable row level security;
alter table scrape_run       enable row level security;

drop policy if exists "anon read brand"      on brand;
drop policy if exists "anon read product"    on product;
drop policy if exists "anon read nutriment"  on nutriment;
drop policy if exists "anon read ingredient" on ingredient;
drop policy if exists "anon read history"    on snapshot_history;

create policy "anon read brand"      on brand            for select to anon using (true);
create policy "anon read product"    on product          for select to anon using (true);
create policy "anon read nutriment"  on nutriment        for select to anon using (true);
create policy "anon read ingredient" on ingredient       for select to anon using (true);
create policy "anon read history"    on snapshot_history for select to anon using (true);

-- service_role bypasses RLS by default (Supabase) — no explicit policy needed.
