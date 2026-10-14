-- Clearly fake data for awdopt-dev ONLY. Never run on prod.
-- Re-runnable: wipes the data tables first (config rows stay).
begin;

truncate public.enquiries, public.adopters, public.dog_photos, public.dogs, public.listers, public.rate_limits;

insert into public.listers (id, name, phone, email, relationship, consent_at) values
  ('00000000-0000-4000-a000-000000000001', 'Sample Lister One', '+910000000001', 'lister1@example.com', 'rescuer', now()),
  ('00000000-0000-4000-a000-000000000002', 'Sample Lister Two', '+910000000002', null, 'foster', now()),
  ('00000000-0000-4000-a000-000000000003', 'Sample Shelter', '+910000000003', 'shelter@example.com', 'shelter_ngo', now());

insert into public.dogs (
  id, slug, lister_id, status, urgent, name, sex, age_months, breed, size, energy, locality,
  temperament, good_with_children, good_with_dogs, good_with_cats, needs_large_space,
  alone_max_hours, handling, medical_needs, vaccination, sterilised, story, admin_notes, approved_at
) values
  ('00000000-0000-4000-b000-000000000001', 'sample-biscuit', '00000000-0000-4000-a000-000000000001', 'approved', false,
   'Sample Biscuit', 'male', 24, 'Indie', 'medium', 'high', 'Bandra', 'Playful, loves fetch',
   true, true, null, false, 4, 'moderate', false, 'full', true, 'Fake story for testing.', 'fake admin note', now()),
  ('00000000-0000-4000-b000-000000000002', 'sample-pepper', '00000000-0000-4000-a000-000000000001', 'approved', true,
   'Sample Pepper', 'female', 6, 'Indie', 'small', 'medium', 'Andheri West', 'Curious puppy',
   true, true, true, false, 2, 'easy', false, 'partial', false, null, null, now()),
  ('00000000-0000-4000-b000-000000000003', 'sample-tofu', '00000000-0000-4000-a000-000000000002', 'approved', false,
   'Sample Tofu', 'male', 96, 'Labrador Retriever', 'large', 'low', 'Powai', 'Calm senior',
   true, true, false, true, 6, 'easy', true, 'full', true, null, null, now()),
  ('00000000-0000-4000-b000-000000000004', 'sample-mango', '00000000-0000-4000-a000-000000000002', 'approved', false,
   'Sample Mango', 'female', 36, 'Indie', 'medium', 'medium', 'Chembur', null,
   null, null, null, null, null, null, null, null, null, null, null, now()),
  ('00000000-0000-4000-b000-000000000005', 'sample-rocket', '00000000-0000-4000-a000-000000000003', 'approved', false,
   'Sample Rocket', 'male', 18, 'Beagle', 'medium', 'high', 'Bandra', 'Very energetic',
   false, true, false, false, 2, 'experienced_only', false, 'full', true, null, null, now()),
  ('00000000-0000-4000-b000-000000000006', 'sample-noodle', '00000000-0000-4000-a000-000000000003', 'approved', false,
   'Sample Noodle', 'female', 60, 'Indie', 'small', 'low', 'Thane', 'Gentle lap dog',
   true, false, true, false, 8, 'easy', false, 'full', true, null, null, now()),
  ('00000000-0000-4000-b000-000000000007', 'sample-pending-pickle', '00000000-0000-4000-a000-000000000001', 'pending', false,
   'Sample Pickle', 'male', 12, 'Indie', 'small', 'medium', 'Dadar', null,
   true, true, true, false, 4, 'easy', false, 'none', false, null, 'awaiting review', null),
  ('00000000-0000-4000-b000-000000000008', 'sample-pending-chutney', '00000000-0000-4000-a000-000000000002', 'pending', true,
   'Sample Chutney', 'female', 30, 'German Shepherd', 'large', 'high', 'Juhu', null,
   false, false, false, true, 3, 'experienced_only', true, 'partial', true, null, null, null),
  ('00000000-0000-4000-b000-000000000009', 'sample-adopted-ladoo', '00000000-0000-4000-a000-000000000003', 'adopted', false,
   'Sample Ladoo', 'female', 48, 'Indie', 'medium', 'medium', 'Worli', null,
   true, true, true, false, 5, 'easy', false, 'full', true, null, null, now()),
  ('00000000-0000-4000-b000-000000000010', 'sample-removed-samosa', '00000000-0000-4000-a000-000000000003', 'removed', false,
   'Sample Samosa', 'male', 72, 'Indie', 'large', 'low', 'Malad', null,
   null, null, null, null, null, null, null, null, null, null, 'removed by admin', null);

-- Files: run `node --env-file=.env.local scripts/seed-dev-photos.mjs` after this seed (generated, clearly fake).
insert into public.dog_photos (dog_id, position, path_480, path_960, path_1600, width, height) values
  ('00000000-0000-4000-b000-000000000001', 0, 'fake/biscuit-0-480.webp', 'fake/biscuit-0-960.webp', 'fake/biscuit-0-1600.webp', 1600, 1200),
  ('00000000-0000-4000-b000-000000000001', 1, 'fake/biscuit-1-480.webp', 'fake/biscuit-1-960.webp', 'fake/biscuit-1-1600.webp', 1600, 1200),
  ('00000000-0000-4000-b000-000000000001', 2, 'fake/biscuit-2-480.webp', 'fake/biscuit-2-960.webp', 'fake/biscuit-2-1600.webp', 1600, 1200),
  ('00000000-0000-4000-b000-000000000002', 0, 'fake/pepper-0-480.webp', 'fake/pepper-0-960.webp', 'fake/pepper-0-1600.webp', 1600, 1200),
  ('00000000-0000-4000-b000-000000000003', 0, 'fake/tofu-0-480.webp', 'fake/tofu-0-960.webp', 'fake/tofu-0-1600.webp', 1600, 1200),
  ('00000000-0000-4000-b000-000000000003', 1, 'fake/tofu-1-480.webp', 'fake/tofu-1-960.webp', 'fake/tofu-1-1600.webp', 1600, 1200),
  ('00000000-0000-4000-b000-000000000005', 0, 'fake/rocket-0-480.webp', 'fake/rocket-0-960.webp', 'fake/rocket-0-1600.webp', 1600, 1200),
  ('00000000-0000-4000-b000-000000000007', 0, 'fake/pickle-0-480.webp', 'fake/pickle-0-960.webp', 'fake/pickle-0-1600.webp', 1600, 1200),
  ('00000000-0000-4000-b000-000000000007', 1, 'fake/pickle-1-480.webp', 'fake/pickle-1-960.webp', 'fake/pickle-1-1600.webp', 1600, 1200),
  ('00000000-0000-4000-b000-000000000008', 0, 'fake/chutney-0-480.webp', 'fake/chutney-0-960.webp', 'fake/chutney-0-1600.webp', 1600, 1200);

insert into public.adopters (
  id, name, age, city, phone, email, home_type, household, has_children_under_12, has_dogs, has_cats,
  activity_level, hours_alone, daily_time, experience, pref_sizes, pref_ages, pref_breed, pref_energy,
  open_to_special_needs, open_to_senior, adopt_reason, timeline, results_token_hash, token_expires_at, consent_at
) values
  ('00000000-0000-4000-c000-000000000001', 'Sample Adopter One', 29, 'Mumbai', '+910000000101', 'adopter1@example.com',
   'apartment_balcony', 'partner', false, false, true, 'high', 4, '2_to_4h', 'some',
   '{medium}', '{young,adult}', 'indie', '{high,medium}', false, false, 'Fake reason', 'within_month',
   sha256('fake-token-1'::bytea), now() + interval '90 days', now()),
  ('00000000-0000-4000-c000-000000000002', 'Sample Adopter Two', 41, 'Thane', '+910000000102', null,
   'house_with_garden', 'family', true, true, false, 'low', 2, '1_to_2h', 'experienced',
   '{}', '{}', 'any', '{}', true, true, null, 'exploring',
   sha256('fake-token-2'::bytea), now() - interval '1 day', now());

insert into public.enquiries (
  adopter_id, dog_id, name, phone, email, message, score, confidence, category_scores, weights, consent_at
) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', 'Sample Adopter One',
   '+910000000101', 'adopter1@example.com', 'Fake message', 88.5, 0.9,
   '{"lifestyle": 1, "living": 0.8}', '{"lifestyle": 25, "living": 20}', now());

commit;
