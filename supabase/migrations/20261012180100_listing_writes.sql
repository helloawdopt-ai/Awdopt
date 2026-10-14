-- Public write paths. Like public_dogs, these run only from the Next.js server (secret key) after
-- zod validation, Turnstile and the rate limit; anon and authenticated cannot execute them.

-- Atomic sliding-window limit per action and salted IP hash. Returns false when over the limit.
create function public.hit_rate_limit(
  p_action public.rate_limit_action,
  p_ip_hash bytea,
  p_max integer,
  p_window interval
) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  if p_max < 1 or p_window <= interval '0' or p_window > interval '1 day' then
    raise exception 'invalid rate limit';
  end if;
  -- Serialise callers with the same key so two requests can't both pass at max - 1.
  perform pg_advisory_xact_lock(hashtextextended(p_action::text || encode(p_ip_hash, 'hex'), 0));
  delete from public.rate_limits where created_at < now() - interval '1 day';
  if (
    select count(*) from public.rate_limits
    where action = p_action and ip_hash = p_ip_hash and created_at > now() - p_window
  ) >= p_max then
    return false;
  end if;
  insert into public.rate_limits (action, ip_hash) values (p_action, p_ip_hash);
  return true;
end $$;

-- Creates the lister, a pending dog and its photo rows in one transaction, and returns the
-- storage paths the server signs upload URLs for. Table CHECKs and enum casts re-validate input.
-- p: { lister: {name, phone, email, relationship}, dog: {...public fields}, photos: [{width, height, ext}] }
create function public.submit_listing(p jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  l jsonb := p -> 'lister';
  d jsonb := p -> 'dog';
  photos jsonb := p -> 'photos';
  lister_id uuid;
  dog_id uuid := gen_random_uuid();
  base text;
  slug text;
  ph jsonb;
  ext text;
  stem text;
  i integer := 0;
  out_photos jsonb := '[]';
begin
  if jsonb_typeof(l) is distinct from 'object' or jsonb_typeof(d) is distinct from 'object'
     or jsonb_typeof(photos) is distinct from 'array'
     or jsonb_array_length(photos) not between 1 and 6 then
    raise exception 'invalid listing';
  end if;

  insert into public.listers (name, phone, email, relationship, consent_at)
  values (l ->> 'name', l ->> 'phone', l ->> 'email', (l ->> 'relationship')::public.lister_relationship, now())
  returning id into lister_id;

  base := trim(both '-' from regexp_replace(lower(d ->> 'name'), '[^a-z0-9]+', '-', 'g'));
  slug := left(coalesce(nullif(base, ''), 'dog'), 60) || '-' || left(md5(dog_id::text), 6);

  insert into public.dogs (
    id, slug, lister_id, status, urgent, name, sex, age_months, breed, size, energy, locality,
    temperament, good_with_children, good_with_dogs, good_with_cats, needs_large_space,
    alone_max_hours, handling, medical_needs, medical_notes, vaccination, sterilised,
    rehoming_reason, story, other_info, video_url
  ) values (
    dog_id, slug, lister_id, 'pending', coalesce((d ->> 'urgent')::boolean, false), d ->> 'name',
    (d ->> 'sex')::public.dog_sex, (d ->> 'age_months')::smallint, d ->> 'breed',
    (d ->> 'size')::public.dog_size, (d ->> 'energy')::public.energy_level, d ->> 'locality',
    d ->> 'temperament', (d ->> 'good_with_children')::boolean, (d ->> 'good_with_dogs')::boolean,
    (d ->> 'good_with_cats')::boolean, (d ->> 'needs_large_space')::boolean,
    (d ->> 'alone_max_hours')::smallint, (d ->> 'handling')::public.handling_level,
    (d ->> 'medical_needs')::boolean, d ->> 'medical_notes',
    (d ->> 'vaccination')::public.vaccination_status, (d ->> 'sterilised')::boolean,
    d ->> 'rehoming_reason', d ->> 'story', d ->> 'other_info', d ->> 'video_url'
  );

  for ph in select value from jsonb_array_elements(photos) loop
    ext := ph ->> 'ext';
    if ext is null or ext not in ('webp', 'jpg') then
      raise exception 'invalid photo';
    end if;
    -- Hashed (UUID) names under the dog's folder; the same paths are reused in the public bucket.
    stem := dog_id::text || '/' || gen_random_uuid()::text;
    insert into public.dog_photos (dog_id, position, path_480, path_960, path_1600, width, height)
    values (
      dog_id, i, stem || '-480.' || ext, stem || '-960.' || ext, stem || '-1600.' || ext,
      (ph ->> 'width')::smallint, (ph ->> 'height')::smallint
    );
    out_photos := out_photos || jsonb_build_array(jsonb_build_array(
      stem || '-480.' || ext, stem || '-960.' || ext, stem || '-1600.' || ext));
    i := i + 1;
  end loop;

  return jsonb_build_object('dog_id', dog_id, 'slug', slug, 'paths', out_photos);
end $$;

revoke execute on function public.hit_rate_limit(public.rate_limit_action, bytea, integer, interval)
  from public, anon, authenticated;
revoke execute on function public.submit_listing(jsonb) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(public.rate_limit_action, bytea, integer, interval)
  to service_role;
grant execute on function public.submit_listing(jsonb) to service_role;
