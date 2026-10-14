-- Photo storage. Listers upload to the private bucket through server-issued signed upload URLs
-- (no policy needed for that). Files move to the public bucket only when an admin approves.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('listing-uploads', 'listing-uploads', false, 2097152, array['image/webp', 'image/jpeg', 'image/png']),
  ('dog-photos', 'dog-photos', true, 2097152, array['image/webp', 'image/jpeg', 'image/png']);

-- Public photos are served by URL only; nobody but an aal2 admin can list, write or delete objects.
create policy admin_select on storage.objects for select to authenticated
  using (bucket_id in ('listing-uploads', 'dog-photos') and (select private.is_admin()));
create policy admin_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('listing-uploads', 'dog-photos') and (select private.is_admin()));
create policy admin_delete on storage.objects for delete to authenticated
  using (bucket_id in ('listing-uploads', 'dog-photos') and (select private.is_admin()));
