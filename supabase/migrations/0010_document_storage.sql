-- Storage for the Documents page.
--
-- Files live in one private bucket, keyed by organization:
--
--   <org_id>/<project_id>/<uuid>-<filename>
--
-- The first path segment is the tenant boundary. Every policy below compares it
-- against current_org_id(), so a member of one organization cannot read, write
-- or delete another's files even if they guess a path. The application never
-- lets the client choose the path — it is built server-side from the caller's
-- profile — but the policies are what actually enforce it.
--
-- Safe to run more than once.

insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 52428800)
on conflict (id) do update
  set public = false,
      file_size_limit = 52428800;

drop policy if exists "org members read documents" on storage.objects;
drop policy if exists "org members upload documents" on storage.objects;
drop policy if exists "org members delete documents" on storage.objects;

create policy "org members read documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy "org members upload documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy "org members delete documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

-- A row whose file was uploaded but never recorded is invisible; a row that
-- names a file nobody can fetch is worse. Neither is expressible as a
-- constraint across the two systems, so the upload records the row last and
-- this index just keeps the lookup by path cheap.
create index if not exists documents_storage_path_idx
  on documents (storage_path)
  where storage_path is not null;
