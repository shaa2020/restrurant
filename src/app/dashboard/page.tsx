import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { Alert, Avatar, Badge, Divider, PageHeader, SectionHeader, Table, Td, Th } from "@/components/ui";
import { requireTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overview" };

const statusTone = {
  trialing: "gold",
  active: "success",
  past_due: "warning",
  canceled: "neutral",
  incomplete: "warning",
  suspended: "danger",
} as const;

const statusLabel = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Payment overdue",
  canceled: "Canceled",
  incomplete: "Awaiting payment",
  suspended: "Suspended",
} as const;

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ welcome?: string; denied?: string }> }) {
  const ctx = await requireTenant();
  const { welcome, denied } = await searchParams;
  const supabase = await createClient();
  const canManage = ctx.role === "owner" || ctx.role === "manager";
  const orgId = ctx.organization.id;

  const [branches, subscription, team, features, catalogue] = await Promise.all([
    supabase.from("branches").select("id, name, city, is_active").eq("organization_id", orgId).order("created_at"),
    canManage
      ? supabase.from("subscriptions").select("status, trial_ends_at, plan:plans(name, limits)").eq("organization_id", orgId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    canManage
      ? supabase.from("memberships").select("id, role, status, user_id, profile:profiles(full_name)").eq("organization_id", orgId).order("created_at")
      : Promise.resolve({ data: null, error: null }),
    supabase.rpc("organization_features", { p_org: orgId }),
    supabase.from("features").select("key, name"),
  ]);

  const firstError = [branches.error, subscription.error, team.error, features.error, catalogue.error].find(Boolean);
  if (firstError) throw new Error(`Could not load overview: ${firstError.message}`);

  type Sub = { status: keyof typeof statusLabel; trial_ends_at: string | null; plan: { name: string; limits: { branches?: number } } };
  type Member = { id: string; role: string; status: string; user_id: string; profile: { full_name: string } | null };
  const sub = subscription.data as unknown as Sub | null;
  const enabled = new Set((features.data as string[] | null) ?? []);
  const members = (team.data as unknown as Member[] | null) ?? [];

  return (
    <div className="flex flex-col gap-12 animate-rise-in">
      <PageHeader
        eyebrow={welcome ? "Your restaurant is ready" : "Overview"}
        title={ctx.organization.name}
        description={
          welcome
            ? "Next, you'll build your menu and set up tables. Menu management arrives in the next release."
            : "Your locations, team and plan at a glance."
        }
        actions={sub ? <Badge tone={statusTone[sub.status]} dot>{statusLabel[sub.status]}</Badge> : undefined}
      />

      {ctx.organization.status === "suspended" && (
        <Alert tone="danger" title="This account is suspended">
          Guest menus and ordering are offline. Contact support to restore access.
        </Alert>
      )}
      {denied && <Alert tone="warning">You don&apos;t have permission to open that page.</Alert>}

      {sub && (
        <section className="grid gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <p className="text-[13px] text-ink-3">Plan</p>
            <p className="text-xl font-medium">{sub.plan.name}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[13px] text-ink-3">{sub.status === "trialing" ? "Trial ends" : "Status"}</p>
            <p className="text-xl font-medium">
              {sub.status === "trialing" && sub.trial_ends_at ? dateFmt.format(new Date(sub.trial_ends_at)) : statusLabel[sub.status]}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[13px] text-ink-3">Locations</p>
            <p className="text-xl font-medium tabular">
              {branches.data?.length ?? 0}
              <span className="text-ink-4"> / {sub.plan.limits.branches ?? "∞"}</span>
            </p>
          </div>
        </section>
      )}

      <Divider />

      <section className="flex flex-col gap-5">
        <SectionHeader title="Locations" description="Each location has its own tables, menus and team access." />
        <ul className="flex flex-col">
          {(branches.data ?? []).map((b) => (
            <li key={b.id} className="flex items-center gap-3 border-b border-stone-200 py-3.5">
              <MapPin aria-hidden className="size-4 text-gold" strokeWidth={1.75} />
              <span className="flex-1 text-[15px] text-ink">{b.name}</span>
              {b.city && <span className="text-sm text-ink-3">{b.city}</span>}
              {!b.is_active && <Badge tone="neutral">Inactive</Badge>}
            </li>
          ))}
        </ul>
      </section>

      {canManage && (
        <section className="flex flex-col gap-5">
          <SectionHeader title="Team" description="Inviting staff and setting permissions arrives with staff management." />
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th className="text-right">Status</Th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <Td>
                    <span className="flex items-center gap-3 text-ink">
                      <Avatar name={m.profile?.full_name || "?"} className="size-7" />
                      {m.profile?.full_name || "Unnamed member"}
                      {m.user_id === ctx.user.id && <span className="text-xs text-ink-3">You</span>}
                    </span>
                  </Td>
                  <Td className="capitalize">{m.role}</Td>
                  <Td className="text-right">
                    <Badge tone={m.status === "active" ? "sage" : "neutral"}>{m.status === "active" ? "Active" : "Disabled"}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      <section className="flex flex-col gap-5">
        <SectionHeader title="Modules" description="What your current plan includes." />
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {[...(catalogue.data ?? [])]
            .sort((a, b) => Number(enabled.has(b.key)) - Number(enabled.has(a.key)) || a.name.localeCompare(b.name))
            .map((f) => (
            <li key={f.key} className="flex items-center justify-between border-b border-stone-200 py-3 text-sm">
              <span className={enabled.has(f.key) ? "text-ink" : "text-ink-3"}>{f.name}</span>
              {enabled.has(f.key) ? <Badge tone="sage">Included</Badge> : <span className="text-xs text-ink-3">Upgrade</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
