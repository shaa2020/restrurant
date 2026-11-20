# Maison OS

A multi-tenant restaurant operating system: QR menus, online ordering, POS, kitchen display, inventory, staff, CRM and analytics. It's built for restaurants in the Netherlands first, then the rest of Europe.

*"Maison" is a working name. Change it in `src/lib/brand.ts`.*

- **Architecture, data model, tenant isolation and roadmap:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Design system:** [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) (live at `/design`)

## Stack
Next.js 16 (App Router, React 19, TypeScript) · Tailwind CSS 4 · Supabase (Postgres + RLS, Auth, Storage, Realtime) · Zod · Vitest. Stripe and React Three Fiber arrive in later stages.

## Status
**Stage 1 is complete.** It includes the schema foundation, Row Level Security, auth, onboarding, the owner overview and the design system. See the stage table in the architecture doc.

## Local development

### 1. Prerequisites
Node ≥ 20.9, a Supabase project (**EU region**), or the Supabase CLI for local development.

### 2. Database
Apply the migrations in `supabase/migrations` in order:

```bash
# with the Supabase CLI, linked to your project
supabase db push
# or locally
supabase start && supabase db reset
```

To create the first platform administrator, run this in the SQL editor:

```sql
insert into public.platform_admins (user_id) select id from auth.users where email = 'you@example.com';
```

### 3. App
```bash
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm install
npm run dev                  # http://localhost:3000
```

In Supabase **Auth → URL configuration**, add `http://localhost:3000/auth/confirm` (and your production URL) to the redirect allow-list. Keep **email confirmation on** in production.

## Tests
| Command | What it checks |
|---|---|
| `npm test` | Unit tests (money/VAT maths, slugs, redirect safety) |
| `npm run db:test` | Applies **every migration** to a fresh Postgres database and runs the RLS and tenant-isolation suite as real `anon` / `authenticated` / `service_role` sessions. Needs `DATABASE_URL` pointing at a disposable Postgres (default `postgres://postgres:postgres@localhost:5432/postgres`). |
| `npm run check` | Lint, typecheck, unit tests and DB tests |

CI (`.github/workflows/ci.yml`) runs all of these, plus a production build, on every push.

## Security rules (non-negotiable)
- Every table has RLS. A new table without policies is closed by default, and anon gets no implicit grants.
- The browser only ever has the **publishable** key. `SUPABASE_SECRET_KEY` is used only in verified webhook handlers.
- Guests never get table access. They reach data only through whitelisted RPCs, and prices are recomputed in the database.
- Payment status is set only from verified provider webhooks, never from a client redirect.
- Every new tenant table needs cross-tenant tests in `tests/db`.

## Deployment (outline; to be expanded in Stage 9)
1. Create a Supabase project in an EU region, sign the DPA, and enable PITR backups.
2. Run `supabase db push` from CI on the main branch, after the test job passes.
3. Deploy the Next.js app (Vercel EU region, or `next build && next start` on any Node host). Set the env vars from `.env.example`.
4. Configure the Auth redirect URLs and SMTP (custom sender domain) in Supabase.
