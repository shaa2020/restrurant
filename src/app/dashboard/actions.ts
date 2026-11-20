"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ACTIVE_ORG_COOKIE, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Switch the active organisation. Membership is verified through RLS before the cookie is set. */
export async function switchOrganization(formData: FormData) {
  const user = await requireUser();
  const orgId = z.string().uuid().safeParse(formData.get("organizationId"));
  if (!orgId.success) redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", orgId.data)
    .eq("status", "active")
    .maybeSingle();

  if (data) {
    (await cookies()).set(ACTIVE_ORG_COOKIE, orgId.data, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  redirect("/dashboard");
}
