# Deployment and operations

How AWDOPT runs, how a change goes live, and how to keep the data safe. Everything runs on accounts owned by
AWDOPT.

| Service | What | Notes |
|---|---|---|
| GitHub | This repository | `main` is production |
| Vercel | Project `awdopt` (team `awdopt`) | Functions in `bom1` (Mumbai), set in `vercel.json` |
| Supabase | `awdopt-prod` (real data) and `awdopt-dev` (fake data only) | Both in `ap-south-1` (Mumbai) |
| Cloudflare | Turnstile widget (bot check on public forms) | Production hostname only |

## Environment variables

Names and one-line descriptions are in `.env.example`. **Secrets are set by hand in the Vercel dashboard
(Project → Settings → Environment Variables) and in your own `.env.local`; never in code, never with a
`NEXT_PUBLIC_` prefix.**

| Name | Secret? | Production | Preview (every non-`main` push) | Local `.env.local` |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | no | the live origin, e.g. `https://awdopt.vercel.app` | not set | `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | no | awdopt-prod URL | awdopt-dev URL | awdopt-dev URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | no | awdopt-prod publishable key | awdopt-dev | awdopt-dev |
| `SUPABASE_SECRET_KEY` | **yes** | awdopt-prod secret key | awdopt-dev | awdopt-dev |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | no | the real widget's site key | Cloudflare test key `1x00000000000000000000AA` | test key |
| `TURNSTILE_SECRET_KEY` | **yes** | the real widget's secret | test secret `1x0000000000000000000000000000000AA` | test secret |
| `RATE_LIMIT_IP_SALT` | **yes** | a long random string | a different random string | any random string |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | **yes** | n/a | n/a | only for `npm run lhci` against a protected preview |

`NEXT_PUBLIC_SITE_URL` is only used for share-image and metadata links; private results links use whatever host
served the page. Changing a variable needs a **redeploy** (Vercel → Deployments → ⋯ → Redeploy) to take effect.

Where to find the values: Supabase → project → Project Settings → API; Cloudflare → Turnstile → the widget.
Rotate a leaked secret there first, then update Vercel and redeploy.

## From a push to the live site

1. Work on a branch. Every push to a branch makes a **Preview deployment** with its own URL, using **awdopt-dev**
   data. Previews sit behind Vercel Authentication (only team members can open them).
2. Before merging, run `npm run lint`, `npm run typecheck`, `npm test` and `npm run e2e` (see the README) and
   check the preview.
3. Merge into `main` (`git merge --no-ff <branch>` then push). Vercel builds `main` and makes it the
   **Production** deployment within about a minute.
4. Check it: Vercel → Deployments shows the build log; open the live site and the admin.

To undo a bad release: Vercel → Deployments → pick the last good production deployment → **Promote** (instant
rollback), then fix forward on a branch. Database changes are not rolled back by this; see migrations below.

Dependabot opens weekly pull requests for npm updates. Take patch updates of Next.js promptly; test major updates
on a branch with the full test suite first.

## Database migrations

`supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql` is the source of truth. Never edit a file that has already been
applied to production; add a new one.

1. Write the migration. Keep the existing patterns: RLS on every new table, `SECURITY INVOKER` functions with
   `set search_path = ''`, and `revoke … from public, anon, authenticated` before granting anything.
2. **Apply it to awdopt-dev**, either:
   - Supabase dashboard → awdopt-dev → **SQL Editor** → paste the whole file → Run, or
   - the Supabase MCP connector's `apply_migration` with the same name (this also records it under
     Database → Migrations).
3. Check **Advisors** (dashboard → Advisors → Security): zero warnings.
4. Regenerate types: `npx supabase gen types typescript --project-id <dev project ref> > src/lib/database.types.ts`
   (or the connector's `generate_typescript_types`), then run `npm test` and `npm run e2e`.
5. At release, apply **the same file** to awdopt-prod the same way, check Advisors on prod, then merge to `main`.

Prod and dev have recorded migration versions that differ from the file timestamps (they were applied through the
connector). Don't run `supabase db push` against them without first lining up the history with
`supabase migration repair`; applying files one by one as above is the supported path.

Never run the seed files on production.

## Auth settings (admin only)

Adopters and listers never log in. The admin does, with a password and an authenticator app. On each Supabase
project, under Authentication:

- **Sign-ups off** (Sign In / Providers → "Allow new users to sign up" off).
- **MFA → TOTP on.**
- **Passwords:** minimum 16 characters with lower, upper, digit and symbol.
- **URL Configuration → Site URL** = the live origin (also add it under Redirect URLs).
- **Admin user:** Authentication → Users → Add user, then in the SQL Editor:
  ```sql
  update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
  where email = 'admin@example.com';
  ```
  The first sign-in asks them to scan a QR code in an authenticator app. To remove an admin, delete the user.
  If an admin loses their phone, remove their authenticator so they can set it up again at the next sign-in:
  ```sql
  delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'admin@example.com');
  ```

## Using your own domain

1. Vercel → Project → Settings → **Domains** → Add (e.g. `awdopt.in` and `www.awdopt.in`). Vercel shows the
   exact DNS records to create (usually an `A` record for the bare domain and a `CNAME` for `www`).
2. At the domain registrar, add those records. HTTPS is issued automatically once DNS resolves (minutes to a few
   hours).
3. Then update, in this order:
   - Vercel: `NEXT_PUBLIC_SITE_URL` (Production) to the new origin, and redeploy.
   - Supabase awdopt-prod → Authentication → URL Configuration: Site URL and Redirect URLs.
   - Cloudflare → Turnstile → the widget → **Hostnames**: add the new domain (keep the old one until the switch is
     done).

## Backups and restore (Supabase Free plan)

The Free plan has **no automatic backups** you can restore from, so take your own. Do it weekly, and always before
a migration on production.

What to back up: the **database data** (schema is already in this repo as migrations) and the **photo files** in
the `dog-photos` bucket (the database only stores their paths).

You need the Supabase CLI (`npx supabase`), which uses Docker for dumps, and the database password from your
password manager (Supabase → Project Settings → Database). Get the connection string from the dashboard's
**Connect** button (use the **Session pooler** string on an IPv4-only network).

```bash
# 1. Data of the app's tables (the public schema)
npx supabase db dump --db-url "<connection string>" -f data.sql --use-copy --data-only --schema public

# 2. Photo files (once per machine: npx supabase login && npx supabase link --project-ref <prod ref>)
npx supabase storage cp -r ss:///dog-photos ./backup-dog-photos --experimental
```

Keep `data.sql` and the photo folder somewhere private and off this machine. They contain personal data: never
commit them.

**Restore into a new project** (for example after an accident):

1. Create a new Supabase project in `ap-south-1`.
2. Apply every file in `supabase/migrations/` in order (SQL Editor or connector).
3. Load the data with `psql`. Triggers are off during the load, and the weight and constraint rows the
   migrations created are cleared first so the backup's own values replace them:
   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --command 'SET session_replication_role = replica' \
     --command 'delete from public.match_weights; delete from public.hard_constraints;' \
     --file data.sql --dbname "<new connection string>"
   ```
4. Upload the photos: link the CLI to the new project, then
   `npx supabase storage cp -r ./backup-dog-photos ss:///dog-photos --experimental`.
5. Redo the Auth settings above (including the admin user), then point Vercel's Production Supabase variables at
   the new project and redeploy.

Rehearse this once on awdopt-dev (back it up, then restore into a scratch project) so the steps are known to work
before they're needed.

Note: Free projects that see no activity for a while can be paused by Supabase; resume them from the dashboard.
Data is kept while paused.

## Moving to Supabase Pro

When the pilot outgrows the Free plan (database size, photo storage, or you want managed backups), upgrade in the
Supabase dashboard (Organization → Billing → change plan). **No code changes.** You get daily backups you can
restore from the dashboard (Database → Backups), no pausing, and higher limits. After upgrading, turn on
Authentication → Passwords → **Prevent use of leaked passwords**.

## Health checks

- **Vercel:** Deployments (build logs), Logs (runtime errors).
- **Supabase:** Advisors (security and performance), Logs, Database → Usage.
- **Locally:** `npm test` (includes the security suite) and `npm run e2e` before every release;
  `LH_TARGET=<preview URL> npm run lhci` for performance budgets.
