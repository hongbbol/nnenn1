-- 20260520000004_storage_bucket.sql
-- Private storage bucket for raw dump snapshots.

insert into storage.buckets (id, name, public)
values ('raw-snapshots', 'raw-snapshots', false)
on conflict (id) do nothing;

-- No public SELECT policy: only service_role can read/write.
-- (Storage RLS is enforced by Supabase by default for private buckets.)
