-- awdopt-dev ONLY. 500 clearly fake approved dogs for the scoring EXPLAIN ANALYZE (target < 50 ms).
-- Run the three parts one at a time with execute_sql on dev: seed, measure, clean up.

-- 1. Seed (bench-* slugs, one fake lister, one fake adopter, one fake photo row per dog).
begin;
insert into public.listers (id, name, phone, relationship, consent_at)
values ('00000000-0000-4000-a000-0000000000be', 'Bench Lister', '+910000000099', 'rescuer', now());

insert into public.dogs (
  slug, lister_id, status, name, sex, age_months, breed, size, energy, locality,
  good_with_children, good_with_dogs, good_with_cats, needs_large_space, alone_max_hours,
  handling, medical_needs, approved_at
)
select
  'bench-' || i, '00000000-0000-4000-a000-0000000000be', 'approved', 'Bench Dog ' || i,
  (array['male', 'female'])[1 + i % 2]::public.dog_sex,
  case when i % 7 = 0 then null else (i * 13) % 150 end,
  (array['Indie', 'Beagle', 'Labrador Retriever'])[1 + i % 3],
  (array['small', 'medium', 'large'])[1 + i % 3]::public.dog_size,
  case when i % 5 = 0 then null else (array['low', 'medium', 'high'])[1 + i % 3]::public.energy_level end,
  'Bandra',
  case i % 4 when 0 then null when 1 then false else true end,
  case i % 6 when 0 then null when 1 then false else true end,
  case i % 5 when 0 then null when 1 then false else true end,
  case when i % 9 = 0 then true else false end,
  case when i % 8 = 0 then null else i % 13 end,
  case when i % 6 = 0 then null else (array['easy', 'moderate', 'experienced_only'])[1 + i % 3]::public.handling_level end,
  i % 10 = 0,
  now()
from generate_series(1, 500) i;

insert into public.dog_photos (dog_id, position, path_480, path_960, path_1600, width, height)
select id, 0, 'fake/bench-480.webp', 'fake/bench-960.webp', 'fake/bench-1600.webp', 1600, 1200
from public.dogs where slug like 'bench-%';

insert into public.adopters (
  id, name, age, city, phone, home_type, household, has_children_under_12, has_dogs, has_cats,
  activity_level, hours_alone, daily_time, experience, pref_sizes, pref_ages, pref_energy,
  open_to_special_needs, open_to_senior, timeline, results_token_hash, token_expires_at, consent_at
) values (
  '00000000-0000-4000-c000-0000000000be', 'Bench Adopter', 30, 'Mumbai', '+910000000098',
  'apartment_balcony', 'partner', true, false, true, 'medium', 6, '1_to_2h', 'some',
  '{medium}', '{young,adult}', '{medium}', false, true, 'within_month',
  sha256('bench-token'::bytea), now() + interval '1 hour', now()
), (
  -- Fits almost every dog (no constraint applies), so nearly all 500 are scored and ranked.
  '00000000-0000-4000-c000-0000000000bf', 'Bench Adopter Open', 30, 'Mumbai', '+910000000097',
  'house_with_garden', 'family', false, false, false, 'high', 0, 'over_4h', 'experienced',
  '{}', '{}', '{}', true, true, 'asap',
  sha256('bench-token-open'::bytea), now() + interval '1 hour', now()
);
commit;

-- 2. Measure.
-- explain (analyze, buffers) select * from public.score_dogs_for_adopter('00000000-0000-4000-c000-0000000000be');
-- explain (analyze, buffers) select * from public.score_dogs_for_adopter('00000000-0000-4000-c000-0000000000bf');
-- explain (analyze, buffers) select public.results_for_token(sha256('bench-token'::bytea));
-- explain (analyze, buffers) select public.results_for_token(sha256('bench-token-open'::bytea));

-- 3. Clean up (photos cascade with the dogs).
-- delete from public.adopters where id in ('00000000-0000-4000-c000-0000000000be', '00000000-0000-4000-c000-0000000000bf');
-- delete from public.dogs where slug like 'bench-%';
-- delete from public.listers where id = '00000000-0000-4000-a000-0000000000be';
