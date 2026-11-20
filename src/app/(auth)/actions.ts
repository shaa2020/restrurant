"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/redirect";
import { publicEnv } from "@/lib/env";

export type AuthState = { error?: string; fieldErrors?: Record<string, string>; notice?: string; email?: string };

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(72, "Use at most 72 characters")
    .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), "Use letters and at least one number"),
  terms: z.literal("on", { error: "Please accept the terms to continue" }),
});

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), email: String(formData.get("email") ?? "") };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    // Deliberately generic: don't reveal whether an account exists.
    const unconfirmed = error.code === "email_not_confirmed";
    return {
      error: unconfirmed ? "Please confirm your email address first — check your inbox." : "Email or password is incorrect.",
      email: parsed.data.email,
    };
  }
  redirect(safeNextPath(parsed.data.next));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), email: String(formData.get("email") ?? "") };

  const origin = (await headers()).get("origin") ?? publicEnv().siteUrl;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
    },
  });

  if (error) {
    if (error.code === "weak_password") return { fieldErrors: { password: error.message }, email: parsed.data.email };
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { error: "Too many attempts. Please wait a minute and try again.", email: parsed.data.email };
    }
    return { error: "We couldn't create your account. Please try again.", email: parsed.data.email };
  }

  // Email confirmation enabled (recommended): no session yet.
  if (!data.session) {
    return { notice: `We've sent a confirmation link to ${parsed.data.email}. Open it to continue setting up your restaurant.` };
  }
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
