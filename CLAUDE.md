@AGENTS.md

# AWDOPT: working rules

Mobile-first Next.js app matching adopters with dogs by a rule-based score. Public repo: assume attackers read it.

## Git and authorship

- Never commit, push, stage, branch, merge or tag, and never work around the block in `.claude/settings.json`.
- Read-only git only: `status`, `diff`, `log`, `show`, `branch --list`.
- No AI attribution anywhere: no Co-Authored-By, no "Generated with", not in commits, PRs, code, README or docs.
- At each checkpoint (working feature, migration + tests, config change): run lint, typecheck, tests and the
  secret scan (`git ls-files -co --exclude-standard | xargs npx --yes @secretlint/quick-start`), show results,
  run `git status --porcelain`, then hand over ONE bash block: `cd`, `git switch -c <branch> || git switch <branch>`,
  `git add <explicit paths>` (never `.`/`-A`), `git status --short`, Conventional Commit (<72 chars), `git push -u`.
  Then stop until the developer replies "pushed".

## Secrets

- Never read, print or ask for secrets (secret key, DB passwords, Turnstile secret, salts, Vercel token).
- `.env.example` holds names + one-line descriptions only. Secrets never get a `NEXT_PUBLIC_` prefix.
- The connectors may set only non-secret Vercel env vars (Supabase URL, publishable key, Turnstile site key).

## Production safety

- Supabase `awdopt-dev` (fake data only) and `awdopt-prod`. All schema work, seeding and tests on dev.
- Prod only at milestone sign-off after the developer types "apply to prod": `apply_migration` with the reviewed
  file plus read-only checks. Never data-changing `execute_sql` on prod.
- Vercel `main` is production. Never change production settings or domains without asking.
- Migrations live in `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`; after each schema change run advisors
  (zero security warnings) and regenerate `src/lib/database.types.ts`.

## Scope

- `docs/private/SCOPE.md` §2 lists the only 15 deliverables. Nothing from §4 "Out of scope".
- Out-of-scope ideas go to `docs/private/SUGGESTIONS.md`, one line each.
- Never reference anything in `docs/private/` from public files.

## Sources of truth (read before coding a screen)

- `docs/private/SCOPE.md` > `docs/private/BRIEF.md` (scope wins); `docs/private/DECISIONS.md` overrides defaults.
- `docs/DESIGN.md` is the brand. `docs/design/prototype/*.dc.html` are reference only: never import or ship them.
- Precedence: Scope > Security & privacy > Accessibility & performance > DESIGN.md > Prototype > Taste > Minimal code.

## Design rules most likely to break

- Tangerine buttons always get Plum text. Every filled control keeps its Plum border.
- Hard Plum shadows only: no blur, gradients or glassmorphism.
- Tilt and sparkles only on decorative stickers. Never in calm zones: personal-data forms, consent, errors, admin.
- Missing data: dashed border + "Not known yet".
- Logo is the SVG `<Logo>` (outlined paths, `npm run logo` regenerates). No emoji in the UI.
- No hex values outside `src/app/tokens.css` (tests/design-rules.test.ts enforces it).

## Platform notes

- Next.js 16: read `node_modules/next/dist/docs/` before using an API. `middleware` is now `src/proxy.ts`.
- Nonce CSP means every page renders per request (root layout awaits `connection()`); `cacheComponents` is off.
  Cache data with `unstable_cache` + tags and `revalidateTag('dogs')`.
- Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run e2e`.
