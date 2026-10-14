-- Matching engine (scope §3). Server-only like public_dogs: SECURITY INVOKER, EXECUTE for service_role.
--
-- Stage 1, hard constraints (only those enabled in hard_constraints). A dog that fails one is
-- excluded: it gets no score or rank, only `excluded_by` (so pages can say how many were left out
-- and why). A NULL ("Not known yet") dog answer never excludes.
--   children_under_12  adopter has children under 12 and the dog is not good with children
--   other_pets         adopter has a dog (cat) and the dog is not good with dogs (cats)
--   large_space        dog needs a large space and the adopter lives in an apartment (balcony or not)
--   special_needs      dog has medical/special needs and the adopter said no to special needs
--   alone_time         adopter's hours alone exceed the dog's longest time alone
--
-- Stage 2, score = 100 · Σ(w·s·k) / Σ(w·k); confidence = Σ(w·k) / Σw over the categories that apply.
-- Each category's s (0–1) is the mean of the sub-checks below that both sides answered; k = 0
-- (s NULL) when none could be answered, so missing data never adds points.
-- "Step" sub-checks compare positions on an ordered scale: s = 1 − 0.5 · gap, kept within 0..1
-- (a negative shortfall means "more than enough" and scores 1).
--   lifestyle      step |activity − energy|  (low/medium/high)
--                  step min |energy − preferred energy|  (only if the adopter picked any)
--   living         step (space need − home space): home apartment 0, apartment with balcony 1,
--                  independent house / house with garden 2; need 2 if the dog needs a large space,
--                  else its size (small 0, medium 1, large 2), 0 if it doesn't and size is unknown
--   time           1 if hours alone ≤ the dog's limit, else 1 − (hours over) / 4, at least 0
--                  step (energy − daily time): low needs under 1 hr, medium 1–2 hrs, high 2–4 hrs
--   household      for each of children / dogs / cats the adopter has: 1 if the dog is good with
--                  them, 0 if not. Doesn't apply when the adopter has none of them (nothing to
--                  compare): left out of both the score and the confidence, not counted as unknown
--   experience     step (handling − experience): easy / some experience / experienced only
--                  vs first dog / some / experienced
--   size           step min |size − preferred size|  (k = 0 when no preference)
--   age            step min |age band − preferred band|; puppy < 1 yr, young 1–3, adult 3–8,
--                  senior 8+  (k = 0 when no preference)
--   special_needs  dog has medical needs: 1 if the adopter is open to them, else 0;
--                  dog is a senior: 1 if open to seniors, else 0;
--                  1 when we know it has neither
--
-- Explanation keys: "why" = up to 3 categories with s ≥ 0.75 (best first), "consider" = up to 2
-- with s < 0.6 (worst first); weight breaks ties, then scope order. Sentences live in
-- src/lib/explanations.ts. Urgent dogs are never ranked higher.

create function public.score_dogs_for_adopter(p_adopter_id uuid)
returns table (
  dog_id uuid,
  rank integer,
  score numeric,
  confidence numeric,
  categories jsonb,
  why text[],
  consider text[],
  excluded_by text[]
)
language sql stable security invoker set search_path = '' as $$
  -- Enum orders, read once (enum_range costs a catalog lookup per call).
  with en as materialized (
    select
      enum_range(null::public.energy_level) as energy,
      enum_range(null::public.dog_size) as size,
      enum_range(null::public.handling_level) as handling,
      enum_range(null::public.age_band) as band
  ),
  a as materialized (
    select
      ad.*,
      array_position(en.energy, ad.activity_level) - 1 as act,
      array_position(enum_range(null::public.experience_level), ad.experience) - 1 as xp,
      array_position(enum_range(null::public.daily_time), ad.daily_time) - 1 as t,
      case ad.home_type when 'apartment_no_balcony' then 0 when 'apartment_balcony' then 1 else 2 end as space,
      (select array_agg(array_position(en.energy, p) - 1) from unnest(ad.pref_energy) p) as pe,
      (select array_agg(array_position(en.size, p) - 1) from unnest(ad.pref_sizes) p) as ps,
      (select array_agg(array_position(en.band, p) - 1) from unnest(ad.pref_ages) p) as pa
    from public.adopters ad cross join en
    where ad.id = p_adopter_id
  ),
  hc as (
    select coalesce(array_agg(key) filter (where enabled), '{}') as on_keys from public.hard_constraints
  ),
  w as materialized (
    select
      sum(weight)::float8 as total,
      coalesce(sum(weight) filter (where category = 'lifestyle'), 0)::float8 as lifestyle,
      coalesce(sum(weight) filter (where category = 'living'), 0)::float8 as living,
      coalesce(sum(weight) filter (where category = 'time'), 0)::float8 as time,
      coalesce(sum(weight) filter (where category = 'household'), 0)::float8 as household,
      coalesce(sum(weight) filter (where category = 'experience'), 0)::float8 as experience,
      coalesce(sum(weight) filter (where category = 'size'), 0)::float8 as size,
      coalesce(sum(weight) filter (where category = 'age'), 0)::float8 as age,
      coalesce(sum(weight) filter (where category = 'special_needs'), 0)::float8 as special_needs
    from public.match_weights
  ),
  d as (
    select
      dg.id, dg.created_at, dg.good_with_children, dg.good_with_dogs, dg.good_with_cats,
      dg.needs_large_space, dg.alone_max_hours, dg.medical_needs,
      array_position(en.energy, dg.energy) - 1 as e,
      array_position(en.size, dg.size) - 1 as sz,
      array_position(en.handling, dg.handling) - 1 as hd,
      case when dg.needs_large_space then 2
           when dg.size is not null then array_position(en.size, dg.size) - 1
           when dg.needs_large_space = false then 0 end as need,
      case
        when dg.age_months is null then null
        when dg.age_months < 12 then 0
        when dg.age_months < 36 then 1
        when dg.age_months < 96 then 2
        else 3
      end as band
    from public.dogs dg cross join en
    where dg.status = 'approved'
  ),
  -- Sub-checks, each 0–1 or NULL when either side didn't answer (gaps here are 0–2 unless clamped).
  -- sub, c and ranked are materialized: inlined, the planner repeats every category expression.
  sub as materialized (
    select
      d.id,
      d.created_at,
      array_remove(array[
        case when 'children_under_12' = any(hc.on_keys) and a.has_children_under_12
          and d.good_with_children = false then 'children_under_12' end,
        case when 'other_pets' = any(hc.on_keys) and ((a.has_dogs and d.good_with_dogs = false)
          or (a.has_cats and d.good_with_cats = false)) then 'other_pets' end,
        case when 'large_space' = any(hc.on_keys) and d.needs_large_space and a.space < 2 then 'large_space' end,
        case when 'special_needs' = any(hc.on_keys) and d.medical_needs
          and not a.open_to_special_needs then 'special_needs' end,
        case when 'alone_time' = any(hc.on_keys) and a.hours_alone > d.alone_max_hours then 'alone_time' end
      ], null) as excluded_by,
      1 - 0.5 * abs(a.act - d.e) as life_activity,
      (select 1 - 0.5 * min(abs(x - d.e)) from unnest(a.pe) x) as life_pref,
      case when d.need is not null then 1 - 0.5 * greatest(d.need - a.space, 0) end as living_space,
      case when d.alone_max_hours is null then null
           when a.hours_alone <= d.alone_max_hours then 1
           else greatest(0, 1 - (a.hours_alone - d.alone_max_hours) / 4.0) end as time_alone,
      case when d.e is not null then 1 - 0.5 * greatest(d.e - a.t, 0) end as time_daily,
      case when a.has_children_under_12 then d.good_with_children::int end as hh_children,
      case when a.has_dogs then d.good_with_dogs::int end as hh_dogs,
      case when a.has_cats then d.good_with_cats::int end as hh_cats,
      a.has_children_under_12 or a.has_dogs or a.has_cats as hh_applies,
      case when d.hd is not null then 1 - 0.5 * greatest(d.hd - a.xp, 0) end as exp_handling,
      (select 1 - 0.5 * min(abs(x - d.sz)) from unnest(a.ps) x) as size_pref,
      case when d.band is not null then
        (select greatest(0, 1 - 0.5 * min(abs(x - d.band))) from unnest(a.pa) x having count(*) > 0) end as age_pref,
      case when d.medical_needs then a.open_to_special_needs::int end as sn_medical,
      case when d.band = 3 then a.open_to_senior::int end as sn_senior,
      case when d.medical_needs = false and d.band < 3 then 1 end as sn_neither
    from a cross join hc cross join d
  ),
  -- Category s = mean of its answered sub-checks; NULL (k = 0) when none were answered.
  c as materialized (
    select
      id, created_at, excluded_by, hh_applies,
      (coalesce(life_activity, 0) + coalesce(life_pref, 0))::float8
        / nullif(num_nonnulls(life_activity, life_pref), 0) as lifestyle,
      living_space::float8 as living,
      (coalesce(time_alone, 0) + coalesce(time_daily, 0))::float8
        / nullif(num_nonnulls(time_alone, time_daily), 0) as time,
      (coalesce(hh_children, 0) + coalesce(hh_dogs, 0) + coalesce(hh_cats, 0))::float8
        / nullif(num_nonnulls(hh_children, hh_dogs, hh_cats), 0) as household,
      exp_handling::float8 as experience,
      size_pref::float8 as size,
      age_pref::float8 as age,
      (coalesce(sn_medical, 0) + coalesce(sn_senior, 0) + coalesce(sn_neither, 0))::float8
        / nullif(num_nonnulls(sn_medical, sn_senior, sn_neither), 0) as special_needs
    from sub
  ),
  ranked as materialized (
    select
      c.*,
      cardinality(c.excluded_by) = 0 as eligible,
      w.lifestyle * coalesce(c.lifestyle, 0) + w.living * coalesce(c.living, 0) + w.time * coalesce(c.time, 0)
        + w.household * coalesce(c.household, 0) + w.experience * coalesce(c.experience, 0)
        + w.size * coalesce(c.size, 0) + w.age * coalesce(c.age, 0)
        + w.special_needs * coalesce(c.special_needs, 0) as num,
      w.lifestyle * (c.lifestyle is not null)::int + w.living * (c.living is not null)::int
        + w.time * (c.time is not null)::int + w.household * (c.household is not null)::int
        + w.experience * (c.experience is not null)::int + w.size * (c.size is not null)::int
        + w.age * (c.age is not null)::int + w.special_needs * (c.special_needs is not null)::int as den,
      w.total - case when c.hh_applies then 0 else w.household end as total
    from c cross join w
  )
  select
    r.id,
    case when r.eligible then (row_number() over (
      order by r.eligible desc, coalesce(100 * r.num / nullif(r.den, 0), 0) desc, r.den desc, r.created_at, r.id
    ))::integer end,
    case when r.eligible then round(coalesce(100 * r.num / nullif(r.den, 0), 0)::numeric, 2) end,
    round(coalesce(r.den / nullif(r.total, 0), 0)::numeric, 3),
    jsonb_build_object(
      'lifestyle', round(r.lifestyle::numeric, 4), 'living', round(r.living::numeric, 4),
      'time', round(r.time::numeric, 4), 'household', round(r.household::numeric, 4),
      'experience', round(r.experience::numeric, 4), 'size', round(r.size::numeric, 4),
      'age', round(r.age::numeric, 4), 'special_needs', round(r.special_needs::numeric, 4)),
    coalesce(x.why, '{}'),
    coalesce(x.consider, '{}'),
    r.excluded_by
  from ranked r
  cross join w
  -- Explanation keys, eligible dogs only. Ties: higher weight, then scope order.
  cross join lateral (
    select
      (array_agg(k order by v desc, wt desc, o) filter (where v >= 0.75 and wt > 0))[1:3] as why,
      (array_agg(k order by v asc, wt desc, o) filter (where v < 0.6 and wt > 0))[1:2] as consider
    from (values
      (1, 'lifestyle', r.lifestyle, w.lifestyle), (2, 'living', r.living, w.living),
      (3, 'time', r.time, w.time), (4, 'household', r.household, w.household),
      (5, 'experience', r.experience, w.experience), (6, 'size', r.size, w.size),
      (7, 'age', r.age, w.age), (8, 'special_needs', r.special_needs, w.special_needs)
    ) as t (o, k, v, wt)
    where r.eligible
  ) x
  order by 2 nulls last, r.id
$$;

-- Page data for a private results link. NULL for a wrong or expired token (the caller passes the
-- SHA-256 of the token; the token itself is never stored). Eligible dogs, ranked, with public card
-- fields and their first photo; p_slug narrows it to one dog (its full profile comes from the
-- cached public_dogs read). "adopter" holds answers used for explanations, never contact details.
create function public.results_for_token(p_token_hash bytea, p_slug text default null)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  with ad as (
    select * from public.adopters
    where results_token_hash = p_token_hash and token_expires_at > now()
  ),
  r as (select s.* from ad cross join lateral public.score_dogs_for_adopter(ad.id) s)
  select jsonb_build_object(
    'adopter', (select jsonb_build_object(
      'activity_level', activity_level, 'home_type', home_type, 'hours_alone', hours_alone,
      'daily_time', daily_time, 'experience', experience, 'has_children_under_12', has_children_under_12,
      'has_dogs', has_dogs, 'has_cats', has_cats, 'pref_sizes', pref_sizes, 'pref_ages', pref_ages,
      'pref_energy', pref_energy, 'open_to_special_needs', open_to_special_needs,
      'open_to_senior', open_to_senior, 'expires_at', token_expires_at) from ad),
    'total', (select count(*) from r),
    'excluded', (select coalesce(jsonb_object_agg(k, n), '{}') from (
      select k, count(*) as n from r cross join unnest(r.excluded_by) k group by k) x),
    'matches', (select coalesce(jsonb_agg(jsonb_build_object(
        'rank', r.rank, 'score', r.score, 'confidence', r.confidence, 'categories', r.categories,
        'why', r.why, 'consider', r.consider,
        'dog', jsonb_build_object(
          'slug', d.slug, 'name', d.name, 'urgent', d.urgent, 'sex', d.sex, 'age_months', d.age_months,
          'breed', d.breed, 'size', d.size, 'energy', d.energy, 'locality', d.locality,
          'photo', (select jsonb_build_object('position', p.position, 'w480', p.path_480,
                      'w960', p.path_960, 'w1600', p.path_1600, 'width', p.width, 'height', p.height)
                    from public.dog_photos p where p.dog_id = d.id and p.position = 0))
      ) order by r.rank), '[]')
      from r join public.dogs d on d.id = r.dog_id
      where r.rank is not null and (p_slug is null or d.slug = p_slug))
  )
  where exists (select 1 from ad)
$$;

revoke execute on function public.score_dogs_for_adopter(uuid) from public, anon, authenticated;
revoke execute on function public.results_for_token(bytea, text) from public, anon, authenticated;
grant execute on function public.score_dogs_for_adopter(uuid) to service_role;
grant execute on function public.results_for_token(bytea, text) to service_role;
