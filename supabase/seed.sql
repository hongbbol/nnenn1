-- supabase/seed.sql — dev sample data (idempotent).

insert into brand (name, parent_company, hq_country)
values ('Acme Cat Foods', 'Acme Holdings', 'US')
on conflict do nothing;

insert into product (barcode, brand_id, product_name, life_stage, form, source_url, source_country)
select '0000000000001',
       (select id from brand where name = 'Acme Cat Foods' limit 1),
       'Acme Chicken Dry',
       'adult',
       'dry',
       'https://world.openpetfoodfacts.org/product/0000000000001',
       'US'
where not exists (select 1 from product where barcode = '0000000000001');

insert into product (barcode, brand_id, product_name, life_stage, form, source_url, source_country)
select '0000000000002',
       (select id from brand where name = 'Acme Cat Foods' limit 1),
       'Acme Salmon Wet',
       'kitten',
       'wet',
       'https://world.openpetfoodfacts.org/product/0000000000002',
       'US'
where not exists (select 1 from product where barcode = '0000000000002');
