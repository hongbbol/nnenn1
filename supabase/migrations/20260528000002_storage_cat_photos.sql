-- ─── Storage bucket: cat-photos ──────────────────────────────
-- dev-plan.md §3.5
-- Note: bucket creation may also be done via Supabase Studio (see GH issue #11).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cat-photos',
  'cat-photos',
  false,
  5242880,  -- 5 MB
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {user_id}/{cat_id}/{uuid}.{ext}
-- Owner-only access on all operations.

drop policy if exists "cat_photos_owner_select" on storage.objects;
create policy "cat_photos_owner_select" on storage.objects
  for select to authenticated using (
    bucket_id = 'cat-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "cat_photos_owner_insert" on storage.objects;
create policy "cat_photos_owner_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'cat-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "cat_photos_owner_update" on storage.objects;
create policy "cat_photos_owner_update" on storage.objects
  for update to authenticated using (
    bucket_id = 'cat-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "cat_photos_owner_delete" on storage.objects;
create policy "cat_photos_owner_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'cat-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
