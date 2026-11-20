# Maison OS — Architecture & Implementation Plan

> "Maison OS" is a working codename. The product name is a commercial decision and
> lives in one place (`src/lib/brand.ts`) so it can be changed later.

## 1. Starting point

The repository was empty when this work began (no commits, no files), so nothing
existing was overwritten. Everything here is new.

## 2. System overview

```
                       ┌──────────────────────────────────────────────┐
  Browsers / tablets   │  Next.js 16 (App Router, React 19, TS)       │
  ───────────────────▶ │                                              │
  /m/[table-token]     │  Server Components  ──┐                      │
  /dashboard           │  Server Actions      ├─▶ Supabase (user JWT) │──┐
  /pos  /kds  /staff   │  Route Handlers      ┘   → RLS enforced       │  │
  /admin               │                                              │  │
                       │  /api/webhooks/stripe ─▶ service role (only  │  │
                       │                          verified webhooks)  │  │
                       └──────────────────────────────────────────────┘  │
                                                                         ▼
                       ┌──────────────────────────────────────────────────────┐
                       │ Supabase                                             │
                       │  Postgres 15+  ── RLS on every table                 │
                       │    public.*   tables + whitelisted RPCs              │
                       │    app.*      private helper functions (not exposed) │
                       │  Auth (email/password, magic link; staff PIN later)  │
                       │  Storage (menu photos, 3D models — tenant paths)     │
                       │  Realtime (orders → KDS/POS, order status → guests)  │
                       └──────────────────────────────────────────────────────┘
                                   ▲                      ▲
                       Stripe (Billing + Payments, iDEAL)  Resend/Postmark (email)
```

### Why this shape

* **One Next.js app, six interfaces, route groups.** The interfaces share auth,
  the design system and the data layer. Splitting into a monorepo of apps adds
  deployment and versioning cost with no benefit at this stage. Route groups keep
  each interface isolated in code (`src/app/(owner)`, `(pos)`, `(kds)` …), and
  we can split later if one of them, for example the KDS, needs its own deploy.
* **The database is the security boundary.** Every tenant table has RLS. The
  frontend never decides what a user may see. Server actions call Supabase
  *with the user's JWT*, so RLS applies to them too. The service-role key is used
  only in verified webhook handlers and admin jobs, never in a request that a
  browser can shape directly.
* **Guests are anonymous and never get table access.** Customers ordering from a
  QR code don't log in. They reach data only through `SECURITY DEFINER` RPCs
  that take an unguessable table or order token and return just what the guest
  needs. Prices are always recomputed server-side from the database. Client-sent
  prices are ignored.
* **Money is integer cents** (`bigint`) with an explicit currency. VAT rates are
  stored in basis points per product (NL: 900 = 9 % food, 2100 = 21 % alcohol).
  Menu prices are VAT-inclusive, as EU consumer law requires.
* **Order lines are snapshots.** Name, price, VAT and modifiers are copied onto
  the order line, so editing the menu never rewrites history or VAT reports.
* **Ledgers, not counters.** Stock, loyalty points and cash drawers are
  append-only movement tables. Current balances are derived (or cached and
  reconciled). That makes them auditable by construction.

## 3. Interfaces & routes

| Interface            | Route prefix         | Who                         | Stage |
|----------------------|----------------------|-----------------------------|-------|
| Marketing / pricing  | `/`, `/pricing`      | public                      | 1–2   |
| Auth                 | `/sign-in`, `/sign-up` | everyone                  | 1     |
| Onboarding           | `/onboarding`        | new owners                  | 1–2   |
| Owner dashboard      | `/dashboard/*`       | owner, manager              | 1–2+  |
| Customer menu        | `/m/[tableToken]`, `/r/[orgSlug]` | guests         | 3     |
| POS                  | `/pos/*`             | cashier, manager            | 4     |
| Kitchen display      | `/kds/*`             | kitchen, manager            | 4     |
| Staff                | `/staff/*`           | all employees               | 7     |
| Super admin          | `/admin/*`           | platform admins             | 8     |
| Design system        | `/design`            | internal reference          | 1     |

## 4. Entity relationship plan

Every table marked (T) carries `organization_id`. Every table marked (B) also
carries `branch_id`, with a composite FK `(branch_id, organization_id) →
branches(id, organization_id)`, so a row can never point at another tenant's
branch. Identifiers are UUID v4. Every table has `created_at`, and mutable ones
have `updated_at`.

### Platform & billing (Stage 1 schema, Stage 8 UI)
```
plans ─┬─< plan_features >── features
       └─< subscriptions >── organizations          (one live subscription per org)
organizations ─< organization_feature_overrides >── features   (enterprise / support)
organizations ─< billing_invoices          (mirrored from Stripe, Stage 8)
platform_admins (user_id)                   audit_logs (T, nullable for platform events)
support_tickets (T, Stage 8)
```

### Tenancy & identity (Stage 1)
```
auth.users 1─1 profiles
organizations ─< branches
organizations ─< memberships >── profiles     role: owner | manager | cashier | kitchen | staff
memberships ─< membership_branches >── branches   (no rows = access to all branches)
organizations ─< invitations                  (Stage 2/7)
```

### Menu (Stage 2)
```
menus (T) ─< menu_categories (T) ─< products (T)
products ─< product_variants (sizes; price_cents, vat_bp)
products ─< product_modifier_groups >── modifier_groups (T) ─< modifiers (price delta)
products ─< product_allergens >── allergens (14 EU allergens, global reference)
products ─< product_translations / category_translations (locale)
products ─< product_media (photos)    products ─1 product_models (GLB, Stage 5)
products ─< branch_product_overrides (B)  (price, availability, out-of-stock)
availability_schedules (T)  price_rules (T, happy hour)   combos (T) ─< combo_items
dining_areas (B) ─< tables (B)  tables.qr_token (unique, rotatable)
```

### Orders, POS, payments (Stages 3–4)
```
orders (B)  channel: dine_in | takeaway   source: qr | pos   status machine
  ├─< order_items (snapshot: name, unit_price_cents, vat_bp, qty, station, status)
  │     └─< order_item_modifiers (snapshot)
  ├─< payments (provider, provider_ref, status — set ONLY by verified webhook / terminal)
  │     └─< refunds
  └─< order_discounts
service_requests (B)  waiter | bill
pos_shifts (B) ─< cash_movements (float, drop, payout, count) → reconciliation
kitchen_stations (B)   receipts (generated from orders + payments)
```

### Inventory & purchasing (Stage 6)
```
units   ingredients (T) ─< stock_movements (B, append-only ledger: receive, sale,
                                            waste, adjust, transfer, count)
        ingredients ─< ingredient_batches (B, expiry)
recipes: product_variants / modifiers ─< recipe_lines >── ingredients (qty, unit)
suppliers (T) ─< supplier_ingredients (price, pack size)
purchase_orders (B) ─< purchase_order_lines   goods_receipts ─< goods_receipt_lines
waste_logs → stock_movements                   low-stock thresholds per branch
```

### Staff (Stage 7)
```
shift_schedules (B) ─< scheduled_shifts >── memberships
time_entries (B: clock in/out, breaks)   tasks (B)   announcements (T)
handover_notes (B)   staff_pins (hashed, for POS quick-switch)
```

### CRM & loyalty (Stage 7)
```
customers (T)  marketing_consent + consent_at + consent_source + consent_text_version
  ├─< loyalty_ledger (append-only)    ├─< customer_feedback
  ├─< referrals                       └─ orders.customer_id (optional, never required)
vouchers (T)   discount_codes (T) ─< discount_redemptions
segments (T: saved filter definitions)   campaigns (T) ─< campaign_sends (consent-checked)
```

### Analytics (Stage 8)
Reporting reads come from SQL views and incremental daily roll-ups
(`daily_branch_sales`, `daily_product_sales`), refreshed by a scheduled job.
Profit reports are labelled **"Estimated (from recipe costs)"**, and VAT
summaries come from order-line snapshots.

## 5. Tenant isolation strategy

1. **RLS enabled on every table in `public`**, including reference tables. A
   table without policies is closed by default.
2. **Membership-based helper functions** in the private `app` schema
   (`SECURITY DEFINER`, `STABLE`, fixed `search_path`):
   * `app.is_platform_admin()`
   * `app.is_org_member(org)`
   * `app.has_org_role(org, roles[])`
   * `app.can_access_branch(org, branch)`, which honours `membership_branches`
   * `app.org_has_feature(org, feature)`, which checks plan, overrides and subscription status

   Policies call these with `(select auth.uid())`-style caching, so they cost
   one indexed lookup per statement, not per row.
3. **Composite foreign keys** stop a row in tenant A from referencing a branch,
   product or table in tenant B, even through a buggy server action.
4. **Immutable tenant columns.** A trigger rejects any change to
   `organization_id` (and `branch_id` where relevant) after insert.
5. **Privileged columns are guarded by triggers.** Organisation `status` and
   subscription fields can only be changed by platform admins or the
   service role.
6. **No anon table grants.** `anon` can execute a short, explicit list of
   guest RPCs and read public reference data (plans, allergens). Nothing else.
7. **Writes that cross rules go through RPCs.** Creating an organisation,
   placing an order or redeeming loyalty points are single transactional
   functions that validate everything server-side.
8. **Storage** objects live under `org/{organization_id}/…`, with storage
   policies that use the same helper functions.
9. **Audit trail.** A generic trigger writes `audit_logs` rows (actor,
   action, before/after) for sensitive tables. The log is append-only: no
   update or delete policy exists, even for platform admins.
10. **Proven by tests.** `tests/db/*.test.ts` runs every migration against
    real Postgres and asserts that cross-tenant reads and writes fail, for
    every role.

## 6. Subscriptions & entitlements

* `plans` (starter €29, professional €69, business €129, enterprise custom)
  carry `price_cents`, `trial_days` and `limits` (JSON: `branches`,
  `staff_seats` …). Prices are rows, not code.
* `features` is the catalogue of feature keys (`qr_menu`, `pos`, `kds`,
  `inventory` …). `plan_features` maps plans to features.
* `organization_feature_overrides` turns features on or off per tenant
  (enterprise deals, support, or suspending a single module).
* `app.org_has_feature()` is the single source of truth. RLS (for module
  tables) and server code both use it, and the UI only mirrors it.
* Subscription status comes **only** from verified Stripe webhooks.

## 7. Implementation milestones

| Stage | Scope | Exit criteria |
|------:|-------|---------------|
| 1 | Architecture, schema foundation, auth, tenant isolation, design system | Migrations apply cleanly, RLS isolation tests pass, sign-up → create organisation → dashboard works, design system page |
| 2 | Registration/onboarding, owner dashboard, menu management, tables & QR codes | Owners can build a full menu, with branch overrides, translations and allergens, and print table QR codes |
| 3 | Guest QR menu, cart, server-priced order placement, order tracking, Realtime | Guests can order without an account, with prices recomputed server-side and live status |
| 4 | POS, table layout, payments (Stripe + iDEAL, terminal later), KDS | End-to-end dine-in flow, with webhook-verified payments, split and refund |
| 5 | 3D viewer (R3F, GLB, lazy load, fallback) + model upload & management | Viewer under 150 kB JS until opened, models validated on upload, 3D toggled per product |
| 6 | Inventory, recipes, auto stock deduction, suppliers, purchase orders, waste, expiry | Stock ledger reconciles, food-cost % per product |
| 7 | Staff (roles, schedules, clocking, tasks), CRM, loyalty, consent-aware marketing | Consent enforced in SQL, loyalty ledger balances |
| 8 | Analytics and exports (CSV/PDF), Stripe Billing, entitlements UI, multi-branch, super admin | Reports match raw order data, plan changes are webhook-driven |
| 9 | Security review, load and performance tests, E2E tests, deployment runbook | Checklist signed off |

## 8. External integrations & dependencies

| Need | Choice | Notes |
|------|--------|-------|
| Hosting | Vercel (EU region `fra1`/`ams`) or any Node host | Next.js standalone output works anywhere |
| DB / Auth / Storage / Realtime | Supabase, **EU region (Frankfurt)** | GDPR: keep data in the EU, sign the Supabase DPA |
| Payments | Stripe Payments: cards, **iDEAL**, Bancontact, Apple/Google Pay | Stripe Connect needed so each restaurant receives its own funds (decision pending, see below) |
| Subscriptions | Stripe Billing | Plans mirror the `plans` table |
| POS card terminals | Stripe Terminal (later) | Alternative: Mollie or Adyen if restaurants prefer them |
| Email | Resend or Postmark | Receipts, invitations, consent-gated marketing |
| 3D | three, @react-three/fiber, @react-three/drei, gltf-transform (server optimisation) | Stage 5 |
| Error monitoring | Sentry (EU data region) | Stage 1 wiring is env-gated |
| Fonts | Self-hosted via Fontsource (Inter, Instrument Serif) | Avoids the Google Fonts CDN, a known GDPR issue in the EU |
| Validation | zod | Every server action input |
| Testing | Vitest (unit + DB/RLS against real Postgres), Playwright (E2E, Stage 3+) | Runs in CI |

## 9. Open decisions (need product-owner input)

1. **Payment flow model.** Stripe Connect (Standard or Express) so restaurants
   get paid directly and the platform optionally takes a fee, or each restaurant
   pastes its own Stripe keys. Connect is recommended.
2. **Trial policy.** Currently a 14-day trial on the chosen plan with no card
   (stored in `plans.trial_days`, so it's easy to change).
3. **Business plan branch limit.** Currently 5 branches (`plans.limits`).
4. **3D menu plan placement.** Currently in Professional and above.
5. **Product name and domain.**
