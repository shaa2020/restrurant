"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ACTIVE_ORG_COOKIE, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ORG_SLUG_PATTERN } from "@/lib/slug";

export type OnboardingState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> };

const schema = z.object({
  name: z.string().trim().min(2, "Enter your restaurant's name").max(120),
  slug: z.string().trim().toLowerCase().regex(ORG_SLUG_PATTERN, "Use 3–48 lowercase letters, numbers or dashes"),
  branchName: z.string().trim().min(2, "Name your first location").max(120),
  city: z.string().trim().max(100).optional(),
  plan: z.enum(["starter", "professional", "business"]),
});

export async function createOrganization(_: OnboardingState, formData: FormData): Promise<OnboardingState> {
  await requireUser("/onboarding");
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors, values: raw };
  }

  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_branch_name: parsed.data.branchName,
    p_plan_id: parsed.data.plan,
    p_city: parsed.data.city || null,
  });

  if (error) {
    if (error.code === "23505") return { fieldErrors: { slug: "This web address is already taken" }, values: raw };
    if (error.code === "23514") return { error: "Some details aren't valid. Please check the form.", values: raw };
    if (error.code === "P0001") return { error: error.message, values: raw };
    console.error("create_organization failed", error);
    return { error: "We couldn't create your restaurant. Please try again.", values: raw };
  }

  (await cookies()).set(ACTIVE_ORG_COOKIE, String(orgId), { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard?welcome=1");
}
