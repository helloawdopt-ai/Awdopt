# AWDOPT

A mobile-first web app that matches people who want to adopt a dog with dogs that need a home, using a
transparent, rule-based compatibility score. Adopters browse dogs, answer a short questionnaire and get a ranked
list with a score and a plain explanation for each dog. Listers send a dog for review. An admin approves
listings, follows each enquiry through to adoption and tunes the scoring.

- Live site: https://awdopt.vercel.app
- Admin: `/admin` (password + authenticator app)

More detail:

| Document                                 | What's in it                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| [docs/SCHEMA.md](docs/SCHEMA.md)         | Every table, column group, function and access rule                      |
| [docs/SCORING.md](docs/SCORING.md)       | How the score is calculated, the hard constraints, and how to retune     |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Environment variables, how a push goes live, migrations, backups         |
| [docs/DESIGN.md](docs/DESIGN.md)         | The "Sticker Club" design system (colours, type, components, copy voice) |

## Stack

- **Next.js 16** (App Router, React Server Components, TypeScript strict), **Tailwind CSS v4**
- **Supabase**: Postgres (data, scoring function, row-level security), Storage (dog photos), Auth (admin only)
- **Vercel** hosting, functions in Mumbai (`bom1`), next to the database (`ap-south-1`)
- **Cloudflare Turnstile** on public forms; `react-hook-form` + `zod/mini` in the browser, `zod` + `libphonenumber-js` on the server
- **three.js** for the landing page's 3D sticker (loaded lazily, `/` only)
- Tests: **Vitest** (unit, database, security), **Playwright** (end-to-end), **Lighthouse CI** (performance budgets)

> Next.js 16 differs from older versions (for example, middleware is `src/proxy.ts`). Its own docs ship in
> `node_modules/next/dist/docs/`; read them before using an API.

## Local setup

You need Node.js 24 and access to the **awdopt-dev** Supabase project (fake data only). There is no local
database and no Docker: development, tests and seeding all use awdopt-dev.

```bash
git clone <this repo> && cd Awdopt
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

Fill `.env.local` with **awdopt-dev** values. `.env.example` lists every name with a one-line description:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase → awdopt-dev → Project Settings → API.
- `SUPABASE_SECRET_KEY`: same page, the **secret** key. Server-only; never give it a `NEXT_PUBLIC_` prefix.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`: for local work use Cloudflare's published test pair
  (`1x00000000000000000000AA` / `1x0000000000000000000000000000000AA`), which always passes.
- `RATE_LIMIT_IP_SALT`: any long random string (`openssl rand -hex 32`).
- `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000`.

`.env.local` is git-ignored. Never commit real values.

### Dev data

awdopt-dev holds clearly fake data from `supabase/seed/dev.sql`: 10 sample dogs (6 live, 2 waiting for review,
1 adopted, 1 removed), 2 sample adopters and 1 enquiry. To reset it, run that file in the awdopt-dev SQL editor
(it wipes the data tables first, never the weights or constraints), then upload the matching fake photos:

```bash
node --env-file=.env.local scripts/seed-dev-photos.mjs
```

Both refuse to run against any project other than awdopt-dev. **Never run a seed on production.**

### An admin account on dev

Public sign-ups are off. Create a user in Supabase → awdopt-dev → Authentication → Users → Add user, then give it
the admin role in the SQL editor:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
where email = 'you@example.com';
```

Sign in at `/admin`. The first sign-in asks you to set up an authenticator app (TOTP); every admin page and action
requires it.

## Scripts

| Command                                                 | What it does                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm run dev`                                           | Development server                                                                       |
| `npm run build` / `npm run start`                       | Production build / serve it                                                              |
| `npm run lint` / `npm run typecheck` / `npm run format` | ESLint / TypeScript / Prettier                                                           |
| `npm test`                                              | Vitest: unit tests, the scoring fixtures and the security suite (against awdopt-dev)     |
| `npm run e2e`                                           | Playwright: builds the app, starts it on port 3100, runs every flow (against awdopt-dev) |
| `npm run lhci`                                          | Lighthouse budgets; set `LH_TARGET=<preview URL>` (see `lighthouserc.cjs`)               |
| `npm run js-size`                                       | First-load JS per route, brotli (start a production server first; see the script header) |
| `npm run contrast`                                      | Colour-contrast checks for the design tokens                                             |
| `npm run logo`                                          | Regenerates the outlined SVG logo                                                        |

`npm test` and `npm run e2e` load `.env.local` and only touch the database when it points at awdopt-dev (the
security suite refuses to start otherwise; database-backed e2e files skip). They create and delete fake users,
listings, adopters and enquiries, and clean up after themselves. The match-weights e2e file runs last, on its own,
because it changes the shared weights (it puts the defaults back).

### What the tests cover

- `tests/matching.test.ts`: the scoring function against 10 dogs × 5 adopters with hand-worked scores
  (each hard constraint, unanswered data, weight changes, ties).
- `tests/security/rls.test.ts`: with the public key, a signed-in non-admin and an admin without the authenticator
  step, every table, function and storage bucket is closed; an admin with it is allowed.
- `tests/e2e/*`: every page and flow, including admin actions replayed without a valid admin session (they must
  change nothing), security headers, 44px touch targets and layouts at 360–1440px.
- `tests/design-rules.test.ts`: no raw colours outside `src/app/tokens.css`, no emoji in the UI.

## Project layout

```
src/app/                 routes (App Router)
  page.tsx               landing (3D hero)
  dogs/                  discovery + profiles
  list/                  "List a dog" form (5 steps)
  match/                 questionnaire (5 steps)
  r/[token]/             private results link, match detail, "I'm Interested"
  admin/                 admin: overview, dogs, adopters, enquiries, match weights
  privacy/               privacy notice
src/components/          UI (ui/ = design-system components)
src/lib/                 shared logic; questionnaire.ts holds all questionnaire wording
src/lib/server/          server-only code (secret key, tokens, rate limits)
src/proxy.ts             nonce CSP + admin session refresh
supabase/migrations/     database schema, security and functions (source of truth)
supabase/seed/           fake dev data
tests/                   Vitest + Playwright
```

## Rules worth keeping

- The repository is public. No real names, phone numbers or photos in code, seeds or tests.
- Secrets live only in `.env.local` and the Vercel dashboard, and are read only in `src/lib/server/*`.
- Public pages never talk to Supabase from the browser; data loads on the server.
- Admin pages run on the admin's own session, so database row-level security applies to them too.
- Colours only in `src/app/tokens.css`; no emoji in the UI.
