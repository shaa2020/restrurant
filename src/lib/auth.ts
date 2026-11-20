import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type MemberRole = "owner" | "manager" | "cashier" | "kitchen" | "staff";

export type SessionUser = { id: string; email: string | null };

export type TenantContext = {
  user: SessionUser;
  organization: { id: string; name: string; slug: string; status: "active" | "suspended" | "closed" };
  role: MemberRole;
  memberships: { organizationId: string; name: string; role: MemberRole }[];
};

export const ACTIVE_ORG_COOKIE = "maison_org";

/** Verified current user (JWT signature checked), or null. Cached per request. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: (data.claims.email as string | undefined) ?? null };
});

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  return user;
}

/**
 * Resolves the active organisation for the signed-in user. Membership is read
 * through RLS, so a forged cookie can never select a foreign organisation —
 * it simply won't be found and we fall back to the user's first membership.
 */
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, organization:organizations!inner(id, name, slug, status)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Could not load memberships: ${error.message}`);

  type Row = { role: MemberRole; organization: TenantContext["organization"] };
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return null;

  const preferred = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const active = rows.find((r) => r.organization.id === preferred) ?? rows[0]!;

  return {
    user,
    organization: active.organization,
    role: active.role,
    memberships: rows.map((r) => ({ organizationId: r.organization.id, name: r.organization.name, role: r.role })),
  };
});

/** For pages that need a tenant: sends signed-out users to sign-in and org-less users to onboarding. */
export async function requireTenant(allowed?: MemberRole[]): Promise<TenantContext> {
  await requireUser();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/onboarding");
  if (allowed && !allowed.includes(ctx.role)) redirect("/dashboard?denied=1");
  return ctx;
}
