import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createUser, expectDenied, pool, sql } from "./helpers";

/**
 * Tenant isolation & authorization tests. These run every migration against a
 * real PostgreSQL database and exercise RLS exactly as Supabase/PostgREST does
 * (role switch + JWT claims). If any of these fail, do not deploy.
 */

let alice: string; // owner, org A
let bob: string; // owner, org B
let dave: string; // manager, org A
let carol: string; // cashier, org A, restricted to branch A2
let mallory: string; // signed in, no organisation
let admin: string; // platform admin
let orgA: string;
let orgB: string;
let branchA1: string;
let branchA2: string;
let branchB1: string;

const rpcCreateOrg = (name: string, slug: string, branch: string, plan = "starter") =>
  `select public.create_organization('${name}', '${slug}', '${branch}', '${plan}') as id`;

beforeAll(async () => {
  alice = await createUser("alice@a.test", "Alice Owner");
  bob = await createUser("bob@b.test", "Bob Owner");
  dave = await createUser("dave@a.test", "Dave Manager");
  carol = await createUser("carol@a.test", "Carol Cashier");
  mallory = await createUser("mallory@x.test", "Mallory");
  admin = await createUser("admin@platform.test", "Platform Admin");
  await sql(`insert into public.platform_admins (user_id) values ($1)`, [admin]);

  orgA = await as(alice, async (c) => (await c.query(rpcCreateOrg("Bistro Amstel", "bistro-amstel", "Centrum"))).rows[0]!.id, true);
  orgB = await as(bob, async (c) => (await c.query(rpcCreateOrg("Brasserie Bruin", "brasserie-bruin", "Utrecht"))).rows[0]!.id, true);

  branchA1 = (await sql(`select id from public.branches where organization_id = $1`, [orgA])).rows[0]!.id;
  branchB1 = (await sql(`select id from public.branches where organization_id = $1`, [orgB])).rows[0]!.id;

  // Fixture setup as service context: org A upgrades to Business (5 branches).
  await sql(`update public.subscriptions set plan_id = 'business', status = 'active' where organization_id = $1`, [orgA]);
  branchA2 = (
    await sql(`insert into public.branches (organization_id, name, slug) values ($1, 'Noord', 'noord') returning id`, [orgA])
  ).rows[0]!.id;
  await sql(`insert into public.memberships (organization_id, user_id, role) values ($1, $2, 'manager')`, [orgA, dave]);
  const carolMembership = (
    await sql(`insert into public.memberships (organization_id, user_id, role) values ($1, $2, 'cashier') returning id`, [orgA, carol])
  ).rows[0]!.id;
  await sql(`insert into public.membership_branches (membership_id, organization_id, branch_id) values ($1, $2, $3)`, [
    carolMembership,
    orgA,
    branchA2,
  ]);
});

afterAll(async () => {
  await pool.end();
});

describe("onboarding: create_organization()", () => {
  it("creates org, owner membership, branch and trial subscription atomically", async () => {
    const { rows } = await sql(
      `select o.slug, m.role, s.plan_id, s.status, s.trial_ends_at > now() + interval '13 days' as trial_ok,
              (select count(*) from public.branches b where b.organization_id = o.id)::int as branches
       from public.organizations o
       join public.memberships m on m.organization_id = o.id and m.user_id = $2
       join public.subscriptions s on s.organization_id = o.id
       where o.id = $1`,
      [orgB, bob],
    );
    expect(rows[0]).toMatchObject({ slug: "brasserie-bruin", role: "owner", plan_id: "starter", status: "trialing", trial_ok: true, branches: 1 });
  });

  it("requires authentication", async () => {
    await expectDenied(as("anon", (c) => c.query(rpcCreateOrg("X Cafe", "x-cafe", "Main"))), { code: "42501" });
  });

  it("rejects duplicate and malformed slugs, and non self-serve plans", async () => {
    await expectDenied(as(mallory, (c) => c.query(rpcCreateOrg("Copy", "bistro-amstel", "Main"))), { code: "23505" });
    await expectDenied(as(mallory, (c) => c.query(rpcCreateOrg("Bad", "Bad Slug!", "Main"))), { code: "23514" });
    await expectDenied(as(mallory, (c) => c.query(rpcCreateOrg("Big", "big-co", "Main", "enterprise"))), { code: "22023" });
  });

  it("reports slug availability without leaking anything else", async () => {
    const r = await as(mallory, (c) =>
      c.query(`select public.is_org_slug_available('bistro-amstel') as taken, public.is_org_slug_available('nieuw-cafe') as free`),
    );
    expect(r.rows[0]).toEqual({ taken: false, free: true });
  });
});

describe("cross-tenant isolation", () => {
  it("each owner sees only their own organisation", async () => {
    const a = await as(alice, (c) => c.query(`select id from public.organizations`));
    const b = await as(bob, (c) => c.query(`select id from public.organizations`));
    const m = await as(mallory, (c) => c.query(`select id from public.organizations`));
    expect(a.rows.map((r) => r.id)).toEqual([orgA]);
    expect(b.rows.map((r) => r.id)).toEqual([orgB]);
    expect(m.rowCount).toBe(0);
  });

  it("an owner cannot read another tenant's branches, members, subscription or audit log", async () => {
    await as(alice, async (c) => {
      for (const table of ["branches", "memberships", "subscriptions", "audit_logs", "membership_branches"]) {
        const r = await c.query(`select 1 from public.${table} where organization_id = $1`, [orgB]);
        expect(r.rowCount, table).toBe(0);
      }
    });
  });

  it("an owner cannot modify another tenant's data", async () => {
    await as(alice, async (c) => {
      expect((await c.query(`update public.organizations set name = 'pwned' where id = $1`, [orgB])).rowCount).toBe(0);
      expect((await c.query(`update public.branches set name = 'pwned' where organization_id = $1`, [orgB])).rowCount).toBe(0);
      expect((await c.query(`delete from public.branches where id = $1`, [branchB1])).rowCount).toBe(0);
    });
    await expectDenied(
      as(alice, (c) => c.query(`insert into public.branches (organization_id, name, slug) values ($1, 'Evil', 'evil')`, [orgB])),
      { code: "42501" },
    );
  });

  it("tenant columns are immutable (cannot move a branch to another tenant)", async () => {
    await expectDenied(
      as(alice, (c) => c.query(`update public.branches set organization_id = $1 where id = $2`, [orgB, branchA1])),
      { code: "42501" },
    );
  });

  it("composite FKs prevent restricting a membership to another tenant's branch", async () => {
    const membership = (await sql(`select id from public.memberships where user_id = $1`, [carol])).rows[0]!.id;
    await expectDenied(
      as(alice, (c) =>
        c.query(`insert into public.membership_branches (membership_id, organization_id, branch_id) values ($1, $2, $3)`, [
          membership,
          orgA,
          branchB1,
        ]),
      ),
      { code: "23503" },
    );
  });

  it("users cannot see profiles of people outside their organisations", async () => {
    const r = await as(alice, (c) => c.query(`select id from public.profiles where id = any($1)`, [[dave, bob, mallory]]));
    expect(r.rows.map((x) => x.id)).toEqual([dave]);
  });
});

describe("role permissions inside a tenant", () => {
  it("a branch-restricted cashier sees only their branch and no management data", async () => {
    await as(carol, async (c) => {
      expect((await c.query(`select id from public.branches`)).rows.map((r) => r.id)).toEqual([branchA2]);
      expect((await c.query(`select user_id from public.memberships`)).rows.map((r) => r.user_id)).toEqual([carol]);
      expect((await c.query(`select 1 from public.subscriptions`)).rowCount).toBe(0);
      expect((await c.query(`select 1 from public.audit_logs`)).rowCount).toBe(0);
      expect((await c.query(`update public.organizations set name = 'x' where id = $1`, [orgA])).rowCount).toBe(0);
    });
  });

  it("a manager cannot grant the owner role", async () => {
    await expectDenied(
      as(dave, (c) => c.query(`update public.memberships set role = 'owner' where user_id = $1 and organization_id = $2`, [carol, orgA])),
      { code: "42501" },
    );
  });

  it("a manager can change a cashier to kitchen staff", async () => {
    const r = await as(dave, (c) =>
      c.query(`update public.memberships set role = 'kitchen' where user_id = $1 and organization_id = $2`, [carol, orgA]),
    );
    expect(r.rowCount).toBe(1);
  });

  it("members cannot be added directly (only via onboarding / invitations)", async () => {
    await expectDenied(
      as(alice, (c) => c.query(`insert into public.memberships (organization_id, user_id, role) values ($1, $2, 'staff')`, [orgA, mallory])),
      { code: "42501" },
    );
  });

  it("the last owner cannot leave or be demoted", async () => {
    await expectDenied(
      as(alice, (c) => c.query(`update public.memberships set role = 'manager' where user_id = $1 and organization_id = $2`, [alice, orgA])),
      { code: "23514" },
    );
    await expectDenied(
      as(alice, (c) => c.query(`delete from public.memberships where user_id = $1 and organization_id = $2`, [alice, orgA])),
      { code: "23514" },
    );
  });

  it("owners cannot change their organisation status or upgrade their own plan", async () => {
    await expectDenied(
      as(alice, (c) => c.query(`update public.organizations set status = 'suspended' where id = $1`, [orgA])),
      { code: "42501" },
    );
    const r = await as(bob, (c) => c.query(`update public.subscriptions set plan_id = 'business' where organization_id = $1`, [orgB]));
    expect(r.rowCount).toBe(0);
  });

  it("enforces the plan's branch limit", async () => {
    await expectDenied(
      as(bob, (c) => c.query(`insert into public.branches (organization_id, name, slug) values ($1, 'Tweede', 'tweede')`, [orgB])),
      { message: /branch limit of 1 reached/ },
    );
  });
});

describe("anonymous access", () => {
  it("can read the public plan catalogue", async () => {
    const r = await as("anon", (c) => c.query(`select id from public.plans order by sort_order`));
    expect(r.rows.map((x) => x.id)).toEqual(["starter", "professional", "business", "enterprise"]);
  });

  it("has no access to tenant tables", async () => {
    for (const table of ["organizations", "branches", "memberships", "subscriptions", "audit_logs", "profiles"]) {
      await expectDenied(as("anon", (c) => c.query(`select 1 from public.${table}`)), { code: "42501" });
    }
  });
});

describe("entitlements", () => {
  const has = (user: string, org: string, feature: string) =>
    as(user, async (c) => (await c.query(`select app.org_has_feature($1, $2) as ok`, [org, feature])).rows[0].ok as boolean);
  const features = (user: string, org: string) =>
    as(user, async (c) => (await c.query(`select public.organization_features($1) as k`, [org])).rows.map((r) => r.k as string));

  it("starter trial includes the menu but not the POS", async () => {
    expect(await features(bob, orgB)).toEqual(["basic_analytics", "menu_builder", "qr_menu"]);
  });

  it("does not reveal another tenant's features", async () => {
    expect(await features(alice, orgB)).toEqual([]);
  });

  it("expired trials lose features; overrides and suspension apply", async () => {
    await sql(`update public.subscriptions set trial_ends_at = now() - interval '1 day' where organization_id = $1`, [orgB]);
    expect(await has(bob, orgB, "qr_menu")).toBe(false);

    await sql(`insert into public.organization_feature_overrides (organization_id, feature_key, enabled) values ($1, 'qr_menu', true)`, [orgB]);
    expect(await has(bob, orgB, "qr_menu")).toBe(true);

    await sql(`update public.organizations set status = 'suspended' where id = $1`, [orgB]);
    expect(await has(bob, orgB, "qr_menu")).toBe(false);

    // restore
    await sql(`update public.organizations set status = 'active' where id = $1`, [orgB]);
    await sql(`delete from public.organization_feature_overrides where organization_id = $1`, [orgB]);
    await sql(`update public.subscriptions set trial_ends_at = now() + interval '14 days' where organization_id = $1`, [orgB]);
  });
});

describe("audit trail", () => {
  it("records tenant changes with the acting user", async () => {
    await as(alice, (c) => c.query(`update public.organizations set name = 'Bistro Amstel & Co' where id = $1`, [orgA]), true);
    const r = await as(alice, (c) =>
      c.query(`select actor_id, action from public.audit_logs where table_name = 'organizations' and action = 'update' and organization_id = $1`, [orgA]),
    );
    expect(r.rows).toContainEqual({ actor_id: alice, action: "update" });
  });

  it("is append-only, even for owners", async () => {
    await as(alice, async (c) => {
      expect((await c.query(`delete from public.audit_logs where organization_id = $1`, [orgA])).rowCount).toBe(0);
      expect((await c.query(`update public.audit_logs set action = 'x' where organization_id = $1`, [orgA])).rowCount).toBe(0);
    });
    await expectDenied(
      as(alice, (c) => c.query(`insert into public.audit_logs (organization_id, action, table_name) values ($1, 'fake', 'x')`, [orgA])),
      { code: "42501" },
    );
  });
});

describe("platform administration", () => {
  it("platform admins see all tenants and can suspend one", async () => {
    await as(admin, async (c) => {
      const r = await c.query(`select id from public.organizations where id = any($1)`, [[orgA, orgB]]);
      expect(r.rowCount).toBe(2);
      expect((await c.query(`update public.organizations set status = 'suspended' where id = $1`, [orgB])).rowCount).toBe(1);
    });
  });

  it("the billing webhook (service role) can update subscriptions", async () => {
    const r = await as("service_role", (c) =>
      c.query(`update public.subscriptions set status = 'active', plan_id = 'professional' where organization_id = $1`, [orgB]),
    );
    expect(r.rowCount).toBe(1);
  });

  it("a manager can add a branch within the plan limit", async () => {
    const r = await as(dave, (c) =>
      c.query(`insert into public.branches (organization_id, name, slug) values ($1, 'Zuid', 'zuid') returning id`, [orgA]),
    );
    expect(r.rowCount).toBe(1);
  });

  it("regular users cannot make themselves platform admins", async () => {
    await expectDenied(as(mallory, (c) => c.query(`insert into public.platform_admins (user_id) values ($1)`, [mallory])), {
      code: "42501",
    });
  });
});
