-- 20260520000003_views.sql
-- Observability views.

-- Korea-leak monitor: must always return zero rows.
create or replace view v_korea_leak_check as
select id, barcode, source_url, source_country
from product
where source_country = 'KR'
   or source_url ilike '%.kr/%'
   or source_url ilike '%.kr';

-- Field completeness: NULL ratio per core nutrient (percent, 0..100).
create or replace view v_field_completeness as
select
  (sum(case when protein_pct  is null then 1 else 0 end)::numeric
     / nullif(count(*), 0)::numeric) * 100 as protein_null_pct,
  (sum(case when fat_pct      is null then 1 else 0 end)::numeric
     / nullif(count(*), 0)::numeric) * 100 as fat_null_pct,
  (sum(case when fiber_pct    is null then 1 else 0 end)::numeric
     / nullif(count(*), 0)::numeric) * 100 as fiber_null_pct,
  (sum(case when moisture_pct is null then 1 else 0 end)::numeric
     / nullif(count(*), 0)::numeric) * 100 as moisture_null_pct,
  count(*) as total_rows
from nutriment;
