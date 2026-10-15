-- Adopter write paths. Like submit_listing: server-only (service_role), called after zod,
-- Turnstile and the rate limit; table CHECKs and enum casts validate every value again.

-- Stores questionnaire answers with the SHA-256 of a fresh results-link token (the token itself
-- never reaches the database). The link works for 90 days.
-- p: { name, age, city, phone (E.164), email, home_type, household, has_children_under_12, has_dogs,
--      has_cats, activity_level, hours_alone, daily_time, experience, pref_sizes[], pref_ages[],
--      pref_energy[], pref_breed, open_to_special_needs, open_to_senior, adopt_reason, timeline }
create function public.submit_questionnaire(p jsonb, p_token_hash bytea) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  adopter_id uuid;
begin
  if jsonb_typeof(p) is distinct from 'object' then
    raise exception 'invalid questionnaire';
  end if;

  insert into public.adopters (
    name, age, city, phone, email, home_type, household, has_children_under_12, has_dogs, has_cats,
    activity_level, hours_alone, daily_time, experience, pref_sizes, pref_ages, pref_energy, pref_breed,
    open_to_special_needs, open_to_senior, adopt_reason, timeline, results_token_hash, token_expires_at,
    consent_at
  ) values (
    p ->> 'name', (p ->> 'age')::smallint, p ->> 'city', p ->> 'phone', p ->> 'email',
    (p ->> 'home_type')::public.home_type, (p ->> 'household')::public.household,
    (p ->> 'has_children_under_12')::boolean, (p ->> 'has_dogs')::boolean, (p ->> 'has_cats')::boolean,
    (p ->> 'activity_level')::public.energy_level, (p ->> 'hours_alone')::smallint,
    (p ->> 'daily_time')::public.daily_time, (p ->> 'experience')::public.experience_level,
    array(select distinct jsonb_array_elements_text(p -> 'pref_sizes'))::public.dog_size[],
    array(select distinct jsonb_array_elements_text(p -> 'pref_ages'))::public.age_band[],
    array(select distinct jsonb_array_elements_text(p -> 'pref_energy'))::public.energy_level[],
    (p ->> 'pref_breed')::public.breed_preference,
    (p ->> 'open_to_special_needs')::boolean, (p ->> 'open_to_senior')::boolean,
    p ->> 'adopt_reason', (p ->> 'timeline')::public.adoption_timeline,
    p_token_hash, now() + interval '90 days', now()
  )
  returning id into adopter_id;

  return adopter_id;
end $$;

-- "I'm Interested" from a results link. Snapshots the dog's current score, confidence, category
-- scores and the weights, recomputed here (never taken from the browser).
-- Returns 'sent', 'duplicate' (an open enquiry from this phone for this dog already exists),
-- 'unavailable' (dog not approved or no longer eligible) or 'expired' (wrong or expired link).
-- p: { dog_slug, name, phone (E.164), email, message }
create function public.submit_enquiry(p jsonb, p_token_hash bytea) returns text
language plpgsql security invoker set search_path = '' as $$
declare
  v_adopter uuid;
  v_dog uuid;
  s record;
begin
  if jsonb_typeof(p) is distinct from 'object' then
    raise exception 'invalid enquiry';
  end if;

  select id into v_adopter from public.adopters
  where results_token_hash = p_token_hash and token_expires_at > now();
  if v_adopter is null then
    return 'expired';
  end if;

  select id into v_dog from public.dogs where slug = p ->> 'dog_slug' and status = 'approved';
  select * into s from public.score_dogs_for_adopter(v_adopter) x where x.dog_id = v_dog and x.rank is not null;
  if not found then
    return 'unavailable';
  end if;

  insert into public.enquiries (
    adopter_id, dog_id, name, phone, email, message, score, confidence, category_scores, weights, consent_at
  ) values (
    v_adopter, v_dog, p ->> 'name', p ->> 'phone', p ->> 'email', p ->> 'message', s.score, s.confidence,
    s.categories, (select jsonb_object_agg(category, weight) from public.match_weights), now()
  );
  return 'sent';
exception
  -- enquiries_one_open_per_phone_dog
  when unique_violation then
    return 'duplicate';
end $$;

revoke execute on function public.submit_questionnaire(jsonb, bytea) from public, anon, authenticated;
revoke execute on function public.submit_enquiry(jsonb, bytea) from public, anon, authenticated;
grant execute on function public.submit_questionnaire(jsonb, bytea) to service_role;
grant execute on function public.submit_enquiry(jsonb, bytea) to service_role;
