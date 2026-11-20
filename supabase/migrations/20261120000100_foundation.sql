-- =============================================================================
-- Stage 1 — Foundation: tenancy, identity, plans/entitlements, audit trail.
-- Security model: see docs/ARCHITECTURE.md §5. RLS is enabled on EVERY table.
-- =============================================================================

create schema if not exists app;          -- private helpers, NOT exposed via the API
revoke all on schema app from public;
grant usage on schema app to authenticated, anon, service_role;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'manager', 'cashier', 'kitchen', 'staff');
create type public.org_status as enum ('active', 'suspended', 'closed');
create type public.membership_status as enum ('active', 'disabled');
create type public.subscription_status as enum
  ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'suspended');

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------
create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Current role is the Supabase service role (server-side jobs/webhooks), a
-- direct database owner session (migrations, maintenance), or trusted code
-- running inside one of OUR SECURITY DEFINER functions (current_user = owner).
-- INVARIANT: only call this from SECURITY INVOKER functions/triggers —
-- inside a definer function it is always true.
create or replace function app.is_service_context() returns boolean
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
      or current_user in ('postgres', 'supabase_admin', 'service_role');
$$;

-- -----------------------------------------------------------------------------
-- Platform: plans, features, admins
-- -----------------------------------------------------------------------------
create table public.plans (
  id            text primary key check (id ~ '^[a-z][a-z0-9_]{1,31}$'),
  name          text not null,
  description   text not null default '',
  price_cents   bigint check (price_cents is null or price_cents >= 0), -- null = custom/quote
  currency      char(3) not null default 'EUR',
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  trial_days    int not null default 14 check (trial_days between 0 and 90),
  limits        jsonb not null default '{}'::jsonb,       -- {"branches": 1, "staff_seats": 10}
  is_public     boolean not null default true,
  sort_order    int not null default 0,
  stripe_price_id text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.features (
  key         text primary key check (key ~ '^[a-z][a-z0-9_]{1,47}$'),
  name        text not null,
  module      text not null,
  description text not null default ''
);

create table public.plan_features (
  plan_id     text not null references public.plans(id) on delete cascade,
  feature_key text not null references public.features(key) on delete cascade,
  primary key (plan_id, feature_key)
);

create table public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Identity
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  avatar_url  text check (avatar_url is null or char_length(avatar_url) <= 500),
  locale      text not null default 'nl' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Profile row is created automatically for every new auth user.
create or replace function app.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- -----------------------------------------------------------------------------
-- Tenancy
-- -----------------------------------------------------------------------------
create table public.organizations (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(btrim(name)) between 2 and 120),
  slug             text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$'),
  status           public.org_status not null default 'active',
  country_code     char(2) not null default 'NL' check (country_code ~ '^[A-Z]{2}$'),
  currency         char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  default_locale   text not null default 'nl' check (default_locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  vat_number       text check (vat_number is null or char_length(vat_number) <= 32),
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.branches (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 2 and 120),
  slug             text not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$'),
  address_line1    text check (address_line1 is null or char_length(address_line1) <= 200),
  postal_code      text check (postal_code is null or char_length(postal_code) <= 16),
  city             text check (city is null or char_length(city) <= 100),
  country_code     char(2) not null default 'NL' check (country_code ~ '^[A-Z]{2}$'),
  timezone         text not null default 'Europe/Amsterdam',
  phone            text check (phone is null or char_length(phone) <= 32),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, slug),
  unique (id, organization_id)      -- target for composite FKs from branch-scoped tables
);
create index branches_org_idx on public.branches (organization_id);

create table public.memberships (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  -- references profiles (which cascades from auth.users) so the API can embed member names
  user_id          uuid not null references public.profiles(id) on delete cascade,
  role             public.member_role not null,
  status           public.membership_status not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (id, organization_id)
);
create index memberships_user_idx on public.memberships (user_id) where status = 'active';

-- Restricts a membership to specific branches. No rows = all branches.
create table public.membership_branches (
  membership_id    uuid not null,
  organization_id  uuid not null,
  branch_id        uuid not null,
  primary key (membership_id, branch_id),
  foreign key (membership_id, organization_id)
    references public.memberships(id, organization_id) on delete cascade,
  foreign key (branch_id, organization_id)
    references public.branches(id, organization_id) on delete cascade
);
create index membership_branches_branch_idx on public.membership_branches (branch_id);

-- -----------------------------------------------------------------------------
-- Subscriptions & entitlements
-- -----------------------------------------------------------------------------
create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null unique references public.organizations(id) on delete cascade,
  plan_id                 text not null references public.plans(id),
  status                  public.subscription_status not null,
  trial_ends_at           timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table public.organization_feature_overrides (
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  feature_key      text not null references public.features(key) on delete cascade,
  enabled          boolean not null,
  reason           text not null default '',
  created_at       timestamptz not null default now(),
  primary key (organization_id, feature_key)
);

-- -----------------------------------------------------------------------------
-- Audit log (append-only)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id               bigint generated always as identity primary key,
  organization_id  uuid,                  -- no FK: audit history must outlive the tenant row
  actor_id         uuid,
  action           text not null,          -- insert | update | delete | <domain event>
  table_name       text not null,
  record_id        text,
  old_data         jsonb,
  new_data         jsonb,
  created_at       timestamptz not null default now()
);
create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);

create or replace function app.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row   jsonb := to_jsonb(coalesce(new, old));
  v_org   uuid;
begin
  v_org := case
    when tg_table_name = 'organizations' then (v_row ->> 'id')::uuid
    else nullif(v_row ->> 'organization_id', '')::uuid
  end;
  insert into public.audit_logs (organization_id, actor_id, action, table_name, record_id, old_data, new_data)
  values (
    v_org,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    v_row ->> 'id',
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

-- -----------------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER bypasses RLS → no policy recursion)
-- -----------------------------------------------------------------------------
create or replace function app.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create or replace function app.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.status = 'active'
      and o.status <> 'closed'
  );
$$;

create or replace function app.has_org_role(p_org uuid, p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any (p_roles)
      and o.status <> 'closed'
  );
$$;

-- Owners/managers without branch restrictions see all branches; restricted
-- members only see the branches listed in membership_branches.
create or replace function app.can_access_branch(p_org uuid, p_branch uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.status = 'active'
      and o.status <> 'closed'
      and (
        m.role = 'owner'
        or not exists (select 1 from public.membership_branches mb where mb.membership_id = m.id)
        or exists (select 1 from public.membership_branches mb
                   where mb.membership_id = m.id and mb.branch_id = p_branch)
      )
  );
$$;

create or replace function app.org_has_feature(p_org uuid, p_feature text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    -- explicit override wins (enterprise deals / support / module suspension)
    (select ofo.enabled from public.organization_feature_overrides ofo
      where ofo.organization_id = p_org and ofo.feature_key = p_feature),
    exists (
      select 1
      from public.subscriptions s
      join public.organizations o on o.id = s.organization_id
      join public.plan_features pf on pf.plan_id = s.plan_id and pf.feature_key = p_feature
      where s.organization_id = p_org
        and o.status = 'active'
        and (
          s.status in ('active', 'past_due')
          or (s.status = 'trialing' and (s.trial_ends_at is null or s.trial_ends_at > now()))
        )
    )
  )
  -- a suspended/closed org never has features, even with overrides
  and exists (select 1 from public.organizations o where o.id = p_org and o.status = 'active');
$$;


-- -----------------------------------------------------------------------------
-- Integrity triggers
-- -----------------------------------------------------------------------------

-- Tenant columns are immutable once written.
create or replace function app.forbid_tenant_change() returns trigger
language plpgsql as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id is immutable' using errcode = '42501';
  end if;
  return new;
end $$;

-- Only platform admins / service role may change organisation status or slug.
create or replace function app.guard_organization_update() returns trigger
language plpgsql as $$
begin
  if (new.status is distinct from old.status or new.created_by is distinct from old.created_by)
     and not (app.is_platform_admin() or app.is_service_context()) then
    raise exception 'only platform administrators can change organization status'
      using errcode = '42501';
  end if;
  return new;
end $$;

-- Every organisation keeps at least one active owner.
create or replace function app.guard_last_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'owner' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active')
     and exists (select 1 from public.organizations where id = old.organization_id)
     and not exists (
       select 1 from public.memberships
       where organization_id = old.organization_id and role = 'owner'
         and status = 'active' and id <> old.id
     ) then
    raise exception 'an organization must keep at least one active owner' using errcode = '23514';
  end if;
  return coalesce(new, old);
end $$;

-- Managers may manage staff, but only owners can grant or modify owner/manager roles.
create or replace function app.guard_membership_privileges() returns trigger
language plpgsql as $$
declare
  v_org uuid := coalesce(new.organization_id, old.organization_id);
begin
  if app.is_service_context() or app.is_platform_admin() or app.has_org_role(v_org, '{owner}') then
    return coalesce(new, old);
  end if;
  if (tg_op <> 'INSERT' and old.role in ('owner', 'manager'))
     or (tg_op <> 'DELETE' and new.role in ('owner', 'manager')) then
    raise exception 'only owners can grant or modify owner/manager memberships' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'membership user is immutable' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

-- Plan branch limit (limits.branches); null/absent = unlimited.
-- Counting must see every branch of the org, so it lives in a definer helper.
create or replace function app.org_branch_limit_reached(p_org uuid) returns int
language sql stable security definer set search_path = '' as $$
  select v.lim from (
    select (p.limits ->> 'branches')::int as lim
    from public.subscriptions s join public.plans p on p.id = s.plan_id
    where s.organization_id = p_org
  ) v
  where v.lim is not null
    and (select count(*) from public.branches b where b.organization_id = p_org) >= v.lim;
$$;

-- SECURITY INVOKER on purpose: current_user must be the caller so
-- app.is_service_context() is meaningful. BEFORE triggers run ahead of RLS
-- WITH CHECK, so authorise first and never reveal another tenant's limits.
create or replace function app.enforce_branch_limit() returns trigger
language plpgsql as $$
declare
  v_limit int;
begin
  if not (app.is_service_context() or app.has_org_role(new.organization_id, '{owner,manager}')) then
    raise exception 'new row violates row-level security policy for table "branches"'
      using errcode = '42501';
  end if;
  v_limit := app.org_branch_limit_reached(new.organization_id);
  if v_limit is not null then
    raise exception 'branch limit of % reached for current plan', v_limit
      using errcode = 'P0001', hint = 'upgrade_required';
  end if;
  return new;
end $$;

-- Subscriptions are written only by verified billing webhooks or platform admins.
create or replace function app.guard_subscription_write() returns trigger
language plpgsql as $$
begin
  if not (app.is_service_context() or app.is_platform_admin()) then
    raise exception 'subscriptions are managed by the billing system' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

-- updated_at
create trigger plans_touch before update on public.plans for each row execute function app.touch_updated_at();
create trigger profiles_touch before update on public.profiles for each row execute function app.touch_updated_at();
create trigger organizations_touch before update on public.organizations for each row execute function app.touch_updated_at();
create trigger branches_touch before update on public.branches for each row execute function app.touch_updated_at();
create trigger memberships_touch before update on public.memberships for each row execute function app.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions for each row execute function app.touch_updated_at();

-- tenant immutability
create trigger branches_tenant before update on public.branches for each row execute function app.forbid_tenant_change();
create trigger memberships_tenant before update on public.memberships for each row execute function app.forbid_tenant_change();
create trigger membership_branches_tenant before update on public.membership_branches for each row execute function app.forbid_tenant_change();
create trigger subscriptions_tenant before update on public.subscriptions for each row execute function app.forbid_tenant_change();

create trigger organizations_guard before update on public.organizations for each row execute function app.guard_organization_update();
create trigger memberships_last_owner before update or delete on public.memberships for each row execute function app.guard_last_owner();
create trigger memberships_privileges before insert or update or delete on public.memberships for each row execute function app.guard_membership_privileges();
create trigger branches_limit before insert on public.branches for each row execute function app.enforce_branch_limit();
create trigger subscriptions_guard before insert or update or delete on public.subscriptions for each row execute function app.guard_subscription_write();

-- audit
create trigger organizations_audit after insert or update or delete on public.organizations for each row execute function app.audit_row();
create trigger branches_audit after insert or update or delete on public.branches for each row execute function app.audit_row();
create trigger memberships_audit after insert or update or delete on public.memberships for each row execute function app.audit_row();
create trigger membership_branches_audit after insert or update or delete on public.membership_branches for each row execute function app.audit_row();
create trigger subscriptions_audit after insert or update or delete on public.subscriptions for each row execute function app.audit_row();
create trigger feature_overrides_audit after insert or update or delete on public.organization_feature_overrides for each row execute function app.audit_row();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.plans                          enable row level security;
alter table public.features                       enable row level security;
alter table public.plan_features                  enable row level security;
alter table public.platform_admins                enable row level security;
alter table public.profiles                       enable row level security;
alter table public.organizations                  enable row level security;
alter table public.branches                       enable row level security;
alter table public.memberships                    enable row level security;
alter table public.membership_branches            enable row level security;
alter table public.subscriptions                  enable row level security;
alter table public.organization_feature_overrides enable row level security;
alter table public.audit_logs                     enable row level security;

-- Defence in depth: anon has no table privileges except public catalogue data,
-- and nothing created later in public is granted to anon or PUBLIC implicitly.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon, public;
alter default privileges in schema app revoke execute on functions from public;
grant select on public.plans, public.features, public.plan_features to anon;

-- Catalogue (public pricing page) ------------------------------------------------
create policy plans_read_public on public.plans for select to anon
  using (is_public);
create policy plans_read on public.plans for select to authenticated
  using (is_public or app.is_platform_admin()
         or exists (select 1 from public.subscriptions s
                    where s.plan_id = plans.id and app.is_org_member(s.organization_id)));
create policy plans_admin_write on public.plans for all to authenticated
  using (app.is_platform_admin()) with check (app.is_platform_admin());

create policy features_read on public.features for select to anon, authenticated using (true);
create policy features_admin_write on public.features for all to authenticated
  using (app.is_platform_admin()) with check (app.is_platform_admin());

create policy plan_features_read on public.plan_features for select to anon, authenticated using (true);
create policy plan_features_admin_write on public.plan_features for all to authenticated
  using (app.is_platform_admin()) with check (app.is_platform_admin());

-- Platform admins: a user may only learn whether they themselves are an admin.
create policy platform_admins_self on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- Profiles -----------------------------------------------------------------------
create policy profiles_read on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or app.is_platform_admin()
    or exists (                                -- co-members of an organization I manage/belong to
      select 1 from public.memberships them
      where them.user_id = profiles.id and app.is_org_member(them.organization_id)
    )
  );
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Organizations ------------------------------------------------------------------
-- No INSERT policy: organisations are created only through public.create_organization().
create policy organizations_read on public.organizations for select to authenticated
  using (app.is_org_member(id) or app.is_platform_admin());
create policy organizations_update on public.organizations for update to authenticated
  using (app.has_org_role(id, '{owner,manager}') or app.is_platform_admin())
  with check (app.has_org_role(id, '{owner,manager}') or app.is_platform_admin());

-- Branches -----------------------------------------------------------------------
create policy branches_read on public.branches for select to authenticated
  using (app.can_access_branch(organization_id, id) or app.is_platform_admin());
create policy branches_insert on public.branches for insert to authenticated
  with check (app.has_org_role(organization_id, '{owner,manager}'));
create policy branches_update on public.branches for update to authenticated
  using (app.has_org_role(organization_id, '{owner,manager}')
         and app.can_access_branch(organization_id, id))
  with check (app.has_org_role(organization_id, '{owner,manager}'));
create policy branches_delete on public.branches for delete to authenticated
  using (app.has_org_role(organization_id, '{owner}'));

-- Memberships --------------------------------------------------------------------
create policy memberships_read on public.memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or app.has_org_role(organization_id, '{owner,manager}')
    or app.is_platform_admin()
  );
-- No client INSERT: members join through create_organization() or the invitation
-- flow (Stage 2), so nobody can be added to an organisation without consent.
create policy memberships_update on public.memberships for update to authenticated
  using (app.has_org_role(organization_id, '{owner,manager}'))
  with check (app.has_org_role(organization_id, '{owner,manager}'));
create policy memberships_delete on public.memberships for delete to authenticated
  using (app.has_org_role(organization_id, '{owner,manager}'));

create policy membership_branches_read on public.membership_branches for select to authenticated
  using (
    app.has_org_role(organization_id, '{owner,manager}')
    or exists (select 1 from public.memberships m
               where m.id = membership_id and m.user_id = (select auth.uid()))
  );
create policy membership_branches_write on public.membership_branches for all to authenticated
  using (app.has_org_role(organization_id, '{owner,manager}'))
  with check (app.has_org_role(organization_id, '{owner,manager}'));

-- Subscriptions (read for owners/managers; writes via webhook/admin only) --------
create policy subscriptions_read on public.subscriptions for select to authenticated
  using (app.has_org_role(organization_id, '{owner,manager}') or app.is_platform_admin());
create policy subscriptions_admin_write on public.subscriptions for all to authenticated
  using (app.is_platform_admin()) with check (app.is_platform_admin());

create policy feature_overrides_read on public.organization_feature_overrides for select to authenticated
  using (app.has_org_role(organization_id, '{owner,manager}') or app.is_platform_admin());
create policy feature_overrides_admin_write on public.organization_feature_overrides for all to authenticated
  using (app.is_platform_admin()) with check (app.is_platform_admin());

-- Audit logs: read-only, no write policies at all (trigger writes as definer).
create policy audit_logs_read on public.audit_logs for select to authenticated
  using (
    (organization_id is not null and app.has_org_role(organization_id, '{owner,manager}'))
    or app.is_platform_admin()
  );

-- =============================================================================
-- RPCs
-- =============================================================================

-- Onboarding: atomically create organisation + owner membership + first branch
-- + trial subscription. Validates everything server-side.
create or replace function public.create_organization(
  p_name        text,
  p_slug        text,
  p_branch_name text,
  p_plan_id     text default 'starter',
  p_city        text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user  uuid := auth.uid();
  v_org   uuid;
  v_plan  public.plans%rowtype;
  v_owned int;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_plan from public.plans where id = p_plan_id and is_public;
  if not found or v_plan.price_cents is null then
    raise exception 'unknown or non self-serve plan: %', p_plan_id using errcode = '22023';
  end if;

  -- abuse guard: a single account can create at most 5 organisations
  select count(*) into v_owned from public.organizations where created_by = v_user;
  if v_owned >= 5 then
    raise exception 'organization limit reached for this account' using errcode = 'P0001';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (btrim(p_name), lower(btrim(p_slug)), v_user)
  returning id into v_org;

  insert into public.memberships (organization_id, user_id, role)
  values (v_org, v_user, 'owner');

  insert into public.subscriptions (organization_id, plan_id, status, trial_ends_at)
  values (v_org, v_plan.id,
          case when v_plan.trial_days > 0 then 'trialing'::public.subscription_status
               else 'incomplete'::public.subscription_status end,
          case when v_plan.trial_days > 0 then now() + make_interval(days => v_plan.trial_days) end);

  insert into public.branches (organization_id, name, slug, city)
  values (v_org, btrim(p_branch_name),
          coalesce(nullif(trim(both '-' from left(regexp_replace(lower(btrim(p_branch_name)), '[^a-z0-9]+', '-', 'g'), 48)), ''), 'main'),
          nullif(btrim(p_city), ''));

  return v_org;
end $$;

-- Is a slug available? (onboarding UX; does not leak anything else)
create or replace function public.is_org_slug_available(p_slug text) returns boolean
language sql stable security definer set search_path = '' as $$
  select lower(btrim(p_slug)) ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$'
     and not exists (select 1 from public.organizations where slug = lower(btrim(p_slug)));
$$;

-- Enabled feature keys for an organisation the caller belongs to.
create or replace function public.organization_features(p_org uuid) returns setof text
language sql stable security definer set search_path = '' as $$
  select f.key from public.features f
  where (app.is_org_member(p_org) or app.is_platform_admin())
    and app.org_has_feature(p_org, f.key)
  order by f.key;
$$;

revoke all on function public.create_organization(text, text, text, text, text) from public, anon;
revoke all on function public.is_org_slug_available(text) from public, anon;
revoke all on function public.organization_features(uuid) from public, anon;
grant execute on function public.create_organization(text, text, text, text, text) to authenticated;
grant execute on function public.is_org_slug_available(text) to authenticated;
grant execute on function public.organization_features(uuid) to authenticated;

-- Private helper functions: callable only where explicitly granted.
revoke all on all functions in schema app from public;
grant execute on function
  app.is_platform_admin(), app.is_org_member(uuid), app.has_org_role(uuid, public.member_role[]),
  app.can_access_branch(uuid, uuid), app.org_has_feature(uuid, text), app.is_service_context(),
  app.org_branch_limit_reached(uuid)
  to authenticated, anon, service_role;
