# Database schema

Supabase Postgres, region `ap-south-1` (Mumbai). The migration files in `supabase/migrations/` are the source of
truth; this page explains them. Apply them in filename order (see [DEPLOYMENT.md](DEPLOYMENT.md)).

| Migration | What it adds |
|---|---|
| `20261012120000_schema` | Enums, the 8 tables, indexes, `updated_at` triggers, the "at least one weight above zero" trigger |
| `20261012120100_rls` | Row-level security on every table, admin policies, `private.is_admin()`, `public_dogs()` |
| `20261012120200_config_rows` | The starting weights and the 5 hard constraints |
| `20261012180000_storage` | The two photo buckets and their admin-only policies |
| `20261012180100_listing_writes` | `submit_listing()`, `hit_rate_limit()` |
| `20261015100000_matching` | `score_dogs_for_adopter()`, `results_for_token()` (formulas: [SCORING.md](SCORING.md)) |
| `20261015100100_match_writes` | `submit_questionnaire()`, `submit_enquiry()` |
| `20261015120000_admin` | Lets the admin session run the ranking and save all weights in one statement |

Conventions: every id is a `uuid`; every free-text column has a length `CHECK`; phone numbers are stored in E.164
(`+919876543210`, checked by a `CHECK`); **`NULL` on a dog field means "Not known yet"**, is shown that way on the
profile, never counts as a good match and never triggers a hard constraint.

## Tables

### `listers`
The person who listed a dog. **Never public**; only the admin sees it.

| Column | Notes |
|---|---|
| `name` | 1–80 chars |
| `phone` | E.164 |
| `email` | optional |
| `relationship` | `owner`, `rescuer`, `foster`, `shelter_ngo`, `helper` |
| `consent_at` | when they ticked the consent box |

### `dogs`
One row per listing.

| Column group | Columns | Notes |
|---|---|---|
| Identity | `slug` (unique, used in URLs), `name`, `lister_id` → `listers` | The slug never changes, so results links survive a rename |
| Status | `status`: `pending` → `approved` → `adopted` / `removed`; `approved_at` | Only `approved` dogs are public or scored |
| Shown on cards | `sex`, `age_months` (0–300), `breed` (`Indie` is a first-class value), `size`, `energy`, `locality` (an area, **never an address**), `city`, `urgent` | `urgent` is a badge only; it never changes the ranking |
| Compatibility | `good_with_children`, `good_with_dogs`, `good_with_cats`, `needs_large_space`, `alone_max_hours` (0–12), `handling` | Used by the score and the hard constraints |
| Health | `medical_needs`, `medical_notes`, `vaccination` (`full`, `partial`, `none`), `sterilised` | |
| Story | `temperament`, `story`, `rehoming_reason`, `other_info`, `video_url` (YouTube or Google Drive link only) | |
| Admin | `admin_notes` | **Never public** |
| Timestamps | `created_at`, `updated_at` | |

### `dog_photos`
Up to 6 per dog (`position` 0–5, unique per dog). Each photo is stored three times, 480, 960 and 1600 px wide
(`path_480`, `path_960`, `path_1600`), as WebP (or JPEG when the browser can't make WebP), with `width`/`height`.
Resizing happens in the lister's browser, which also drops location data from the file.

### `adopters`
One row per questionnaire (a retake makes a new row and a new link). **Never public.**

| Section | Columns |
|---|---|
| Basic | `name`, `age` (18–120), `city`, `phone`, `email` |
| Home | `home_type` (`apartment_no_balcony`, `apartment_balcony`, `independent_house`, `house_with_garden`), `household` (`alone`, `partner`, `family`, `flatmates`), `has_children_under_12`, `has_dogs`, `has_cats` |
| Lifestyle | `activity_level` (low/medium/high), `hours_alone` (0–24), `daily_time` (`under_1h` … `over_4h`), `experience` (`first_time`, `some`, `experienced`) |
| Preferences | `pref_sizes[]`, `pref_ages[]` (`puppy`, `young`, `adult`, `senior`), `pref_energy[]`, `pref_breed` (`indie`, `pedigree`, `any`), `open_to_special_needs`, `open_to_senior`. An empty list means "no preference" |
| Intent | `adopt_reason` (optional), `timeline` (`asap`, `within_month`, `within_3_months`, `exploring`) |
| Private link | `results_token_hash` (SHA-256 of the link's token; the token itself is never stored), `token_expires_at` (90 days) |

### `enquiries`
"I'm Interested", from a results link.

| Column | Notes |
|---|---|
| `adopter_id`, `dog_id` | Deleting either deletes the enquiry |
| `name`, `phone`, `email`, `message` | What the person typed in the enquiry form |
| `score`, `confidence`, `category_scores`, `weights` | **Snapshot at submit time**, recomputed in the database (never taken from the browser). Later weight changes don't alter it |
| `status` | The 8 outcome statuses: `interested`, `contacted`, `meeting`, `rejected`, `adoption_in_progress`, `adopted`, `adoption_unsuccessful`, `follow_up_required` |
| `reason` | Optional note, mainly for unsuccessful outcomes (≤ 500 chars) |

**One open enquiry per phone per dog**: a unique index on `(dog_id, phone)` covers every status except
`rejected`, `adopted` and `adoption_unsuccessful`. A second "I'm Interested" from the same number is refused while
one is open, and the admin can't reopen a closed one while another is open.

In the admin overview, **Matches** counts enquiries at `meeting`, `adoption_in_progress`, `adopted` or
`adoption_unsuccessful`; **Adoptions** counts dogs with status `adopted`. Setting an enquiry to Adopted also marks
its dog adopted.

### `match_weights`
One row per scoring category (`lifestyle`, `living`, `time`, `household`, `experience`, `size`, `age`,
`special_needs`) with a `weight` ≥ 0. A statement-level trigger refuses any change that leaves every weight at
zero. Edited in the admin under Match weights.

### `hard_constraints`
Five rows (`children_under_12`, `other_pets`, `large_space`, `special_needs`, `alone_time`), each with a
`description` and an `enabled` switch. See [SCORING.md](SCORING.md).

### `rate_limits`
Salted hashes of visitor IP addresses with an action (`enquiry`, `listing`, `questionnaire`) and a time. **Raw IP
addresses are never stored.** Rows older than a day are deleted on the next write. Not readable by anyone, the
admin included.

## Storage

| Bucket | Access | Holds |
|---|---|---|
| `listing-uploads` | Private | Photos of listings waiting for review. Uploaded through short-lived signed URLs issued by the server |
| `dog-photos` | Public read (by URL only; nobody can list it) | Photos of approved dogs |

Both: WebP/JPEG/PNG only, 2 MB per file, file names are random UUIDs. On approval the admin's session checks every
file's real type (magic bytes) and size, copies it to `dog-photos` and deletes the private copy. Rejecting deletes
the uploads; removing a live dog deletes its public files.

## Who can do what

Row-level security is on for every table and **denies by default**.

| Who | Can |
|---|---|
| Visitors (public key, `anon`) | No table or function access at all. Only approved dogs' photo files, by their public URL |
| The Next.js server (secret key, `service_role`, only in `src/lib/server/*`) | `public_dogs()` for public pages, the four write functions and the rate limit, `results_for_token()` |
| Admin (signed in, `app_metadata.role = "admin"` **and** a TOTP-verified session, `aal2`) | Read and write the admin tables, run `score_dogs_for_adopter()`, manage photos. Checked by `private.is_admin()` in every policy |
| Any other signed-in user, or an admin who skipped TOTP | Nothing (RLS returns no rows) |

The app checks the admin session again in every admin page and action (`requireAdmin()`), so a request that gets
past the page guard still can't change anything. Admin pages use the admin's own session, never the secret key.

## Functions

All are `SECURITY INVOKER` with an empty `search_path`, and validate their input again with table `CHECK`s and enum
casts.

| Function | Who runs it | Does |
|---|---|---|
| `public_dogs()` | server | Approved dogs, public columns only (no lister, no admin notes), with photos. Filtered and paged by PostgREST |
| `submit_listing(p)` | server | Lister + pending dog + photo rows in one transaction; returns the storage paths to sign |
| `hit_rate_limit(action, ip_hash, max, window)` | server | Sliding-window limit, safe under concurrent requests |
| `submit_questionnaire(p, token_hash)` | server | Stores the answers and the hashed link token (90 days) |
| `score_dogs_for_adopter(adopter_id)` | server, admin | Ranks every approved dog for one adopter. See [SCORING.md](SCORING.md) |
| `results_for_token(token_hash, slug?)` | server | Everything a results page needs, in one call; `NULL` for a wrong or expired link |
| `submit_enquiry(p, token_hash)` | server | Stores an enquiry with its score snapshot; returns `sent`, `duplicate`, `unavailable` or `expired` |

## Indexes

Foreign keys (`dogs.lister_id`, `enquiries.adopter_id`, `enquiries.dog_id`; `dog_photos` via its unique key),
`dogs.status`, `enquiries.status`, partial indexes on approved dogs for the discovery feed and each filter (area,
size, energy, breed, age), and the rate-limit lookup. Ranking 500 approved dogs for one adopter takes about 40 ms.
