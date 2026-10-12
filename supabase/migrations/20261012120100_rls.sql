-- Deny by default. anon gets no table privileges at all; authenticated only reaches tables
-- through admin policies (app_metadata.role = 'admin' AND an MFA-verified aal2 session).

alter table public.listers enable row level security;
alter table public.dogs enable row level security;
alter table public.dog_photos enable row level security;
alter table public.adopters enable row level security;
alter table public.enquiries enable row level security;
alter table public.match_weights enable row level security;
alter table public.hard_constraints enable row level security;
alter table public.rate_limits enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Objects created later start closed too.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

-- Admin check lives outside the exposed schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.is_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' and (auth.jwt() ->> 'aal') = 'aal2',
    false
  )
$$;

revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- Admin tables. rate_limits stays server-only (no grants).
grant select, insert, update, delete on
  public.listers, public.dogs, public.dog_photos, public.adopters, public.enquiries
to authenticated;
grant select, update on public.match_weights, public.hard_constraints to authenticated;

create policy admin_all on public.listers for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy admin_all on public.dogs for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy admin_all on public.dog_photos for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy admin_all on public.adopters for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy admin_all on public.enquiries for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy admin_all on public.match_weights for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy admin_all on public.hard_constraints for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Public read: approved dogs, public columns only (no lister, no admin notes).
-- Called only by the Next.js server (src/lib/server/*, secret key); anon and authenticated
-- cannot execute it, so the anon key reaches nothing over the API.
-- PostgREST filters, orders and limits the result: /rpc/public_dogs?size=eq.small&limit=12
create function public.public_dogs()
returns table (
  id uuid,
  slug text,
  name text,
  urgent boolean,
  sex public.dog_sex,
  age_months smallint,
  breed text,
  size public.dog_size,
  energy public.energy_level,
  locality text,
  city text,
  temperament text,
  good_with_children boolean,
  good_with_dogs boolean,
  good_with_cats boolean,
  needs_large_space boolean,
  alone_max_hours smallint,
  handling public.handling_level,
  medical_needs boolean,
  medical_notes text,
  vaccination public.vaccination_status,
  sterilised boolean,
  rehoming_reason text,
  story text,
  other_info text,
  video_url text,
  created_at timestamptz,
  photos jsonb
)
language sql stable security invoker set search_path = '' as $$
  select
    d.id, d.slug, d.name, d.urgent, d.sex, d.age_months, d.breed, d.size, d.energy,
    d.locality, d.city, d.temperament, d.good_with_children, d.good_with_dogs, d.good_with_cats,
    d.needs_large_space, d.alone_max_hours, d.handling, d.medical_needs, d.medical_notes,
    d.vaccination, d.sterilised, d.rehoming_reason, d.story, d.other_info, d.video_url,
    d.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
         'position', p.position, 'w480', p.path_480, 'w960', p.path_960, 'w1600', p.path_1600,
         'width', p.width, 'height', p.height) order by p.position)
       from public.dog_photos p where p.dog_id = d.id),
      '[]'::jsonb)
  from public.dogs d
  where d.status = 'approved'
$$;

revoke execute on function public.public_dogs() from public, anon, authenticated;
grant execute on function public.public_dogs() to service_role;
