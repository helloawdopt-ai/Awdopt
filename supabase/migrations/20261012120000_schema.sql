-- AWDOPT V1 data model. Field lists and options: see docs/SCHEMA.md (written at handover).
-- Unknown values are NULL and mean "Not known yet"; scoring treats them as unanswered (k = 0).

create type public.dog_status as enum ('pending', 'approved', 'adopted', 'removed');
create type public.dog_sex as enum ('male', 'female');
create type public.dog_size as enum ('small', 'medium', 'large');
create type public.energy_level as enum ('low', 'medium', 'high');
create type public.age_band as enum ('puppy', 'young', 'adult', 'senior');
create type public.vaccination_status as enum ('full', 'partial', 'none');
create type public.handling_level as enum ('easy', 'moderate', 'experienced_only');
create type public.lister_relationship as enum ('owner', 'rescuer', 'foster', 'shelter_ngo', 'helper');
create type public.home_type as enum ('apartment_no_balcony', 'apartment_balcony', 'independent_house', 'house_with_garden');
create type public.household as enum ('alone', 'partner', 'family', 'flatmates');
create type public.experience_level as enum ('first_time', 'some', 'experienced');
create type public.daily_time as enum ('under_1h', '1_to_2h', '2_to_4h', 'over_4h');
create type public.breed_preference as enum ('indie', 'pedigree', 'any');
create type public.adoption_timeline as enum ('asap', 'within_month', 'within_3_months', 'exploring');
create type public.enquiry_status as enum (
  'interested', 'contacted', 'meeting', 'rejected',
  'adoption_in_progress', 'adopted', 'adoption_unsuccessful', 'follow_up_required'
);
create type public.match_category as enum (
  'lifestyle', 'living', 'time', 'household', 'experience', 'size', 'age', 'special_needs'
);
create type public.rate_limit_action as enum ('enquiry', 'listing', 'questionnaire');

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Who listed the dog. Contact details are admin-only, never public.
create table public.listers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  relationship public.lister_relationship not null,
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.dogs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  lister_id uuid not null references public.listers (id) on delete restrict,
  status public.dog_status not null default 'pending',
  urgent boolean not null default false,
  name text not null check (char_length(name) between 1 and 40),
  sex public.dog_sex,
  age_months smallint check (age_months between 0 and 300),
  breed text check (char_length(breed) between 1 and 60), -- 'Indie' is a first-class value
  size public.dog_size,
  energy public.energy_level,
  locality text not null check (char_length(locality) between 1 and 60), -- area only, never an address
  city text not null default 'Mumbai' check (char_length(city) between 1 and 40),
  temperament text check (char_length(temperament) <= 300),
  good_with_children boolean,
  good_with_dogs boolean,
  good_with_cats boolean,
  needs_large_space boolean,
  alone_max_hours smallint check (alone_max_hours between 0 and 12),
  handling public.handling_level,
  medical_needs boolean,
  medical_notes text check (char_length(medical_notes) <= 500),
  vaccination public.vaccination_status,
  sterilised boolean,
  rehoming_reason text check (char_length(rehoming_reason) <= 500),
  story text check (char_length(story) <= 2000),
  other_info text check (char_length(other_info) <= 1000),
  video_url text check (
    char_length(video_url) <= 300
    and video_url ~ '^https://(www\.|m\.)?(youtube\.com|youtu\.be|drive\.google\.com)/'
  ),
  admin_notes text check (char_length(admin_notes) <= 1000), -- never public
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger dogs_updated_at before update on public.dogs
for each row execute function public.set_updated_at();

-- Up to 6 photos per dog, each stored at 480/960/1600 px wide (WebP, hashed names).
create table public.dog_photos (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  position smallint not null check (position between 0 and 5),
  path_480 text not null check (char_length(path_480) <= 200),
  path_960 text not null check (char_length(path_960) <= 200),
  path_1600 text not null check (char_length(path_1600) <= 200),
  width smallint not null check (width > 0),
  height smallint not null check (height > 0),
  created_at timestamptz not null default now(),
  unique (dog_id, position)
);

-- Questionnaire answers. No login: adopters return through a private link (only its hash is stored).
create table public.adopters (
  id uuid primary key default gen_random_uuid(),
  -- Basic
  name text not null check (char_length(name) between 1 and 80),
  age smallint not null check (age between 18 and 120),
  city text not null check (char_length(city) between 1 and 40),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Home
  home_type public.home_type not null,
  household public.household not null,
  has_children_under_12 boolean not null,
  has_dogs boolean not null,
  has_cats boolean not null,
  -- Lifestyle
  activity_level public.energy_level not null,
  hours_alone smallint not null check (hours_alone between 0 and 24),
  daily_time public.daily_time not null,
  experience public.experience_level not null,
  -- Preferences (empty array = no preference)
  pref_sizes public.dog_size[] not null default '{}',
  pref_ages public.age_band[] not null default '{}',
  pref_breed public.breed_preference not null default 'any',
  pref_energy public.energy_level[] not null default '{}',
  open_to_special_needs boolean not null,
  open_to_senior boolean not null,
  -- Intent
  adopt_reason text check (char_length(adopt_reason) <= 500),
  timeline public.adoption_timeline not null,
  -- Private results link
  results_token_hash bytea not null unique check (octet_length(results_token_hash) = 32),
  token_expires_at timestamptz not null,
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Interest in a dog. Score, category scores and weights are snapshotted at submit time.
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  adopter_id uuid not null references public.adopters (id) on delete cascade,
  dog_id uuid not null references public.dogs (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text check (char_length(message) <= 1000),
  status public.enquiry_status not null default 'interested',
  reason text check (char_length(reason) <= 500),
  score numeric(5, 2) not null check (score between 0 and 100),
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  category_scores jsonb not null check (jsonb_typeof(category_scores) = 'object'),
  weights jsonb not null check (jsonb_typeof(weights) = 'object'),
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger enquiries_updated_at before update on public.enquiries
for each row execute function public.set_updated_at();

-- One open enquiry per phone per dog.
create unique index enquiries_one_open_per_phone_dog on public.enquiries (dog_id, phone)
where status not in ('rejected', 'adopted', 'adoption_unsuccessful');

create table public.match_weights (
  category public.match_category primary key,
  weight numeric(5, 2) not null check (weight >= 0),
  updated_at timestamptz not null default now()
);

create trigger match_weights_updated_at before update on public.match_weights
for each row execute function public.set_updated_at();

-- At least one weight must stay above zero.
create function public.check_weights_not_all_zero() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.match_weights where weight > 0) then
    raise exception 'at least one match weight must be above zero';
  end if;
  return null;
end $$;

create trigger match_weights_not_all_zero after update or delete on public.match_weights
for each statement execute function public.check_weights_not_all_zero();

create table public.hard_constraints (
  key text primary key check (key ~ '^[a-z0-9_]{1,40}$'),
  description text not null check (char_length(description) <= 200),
  enabled boolean not null default true
);

-- Salted IP hashes only; raw IPs are never stored.
create table public.rate_limits (
  id bigint generated always as identity primary key,
  action public.rate_limit_action not null,
  ip_hash bytea not null check (octet_length(ip_hash) = 32),
  created_at timestamptz not null default now()
);

-- Indexes: foreign keys, statuses, and filters on approved dogs.
create index dogs_lister_id on public.dogs (lister_id);
create index dogs_status on public.dogs (status);
create index dogs_approved_feed on public.dogs (created_at desc, id desc) where status = 'approved';
create index dogs_approved_locality on public.dogs (locality) where status = 'approved';
create index dogs_approved_size on public.dogs (size) where status = 'approved';
create index dogs_approved_energy on public.dogs (energy) where status = 'approved';
create index dogs_approved_breed on public.dogs (breed) where status = 'approved';
create index dogs_approved_age on public.dogs (age_months) where status = 'approved';
create index enquiries_adopter_id on public.enquiries (adopter_id);
create index enquiries_dog_id on public.enquiries (dog_id);
create index enquiries_status on public.enquiries (status);
create index rate_limits_lookup on public.rate_limits (action, ip_hash, created_at desc);
