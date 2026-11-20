/**
 * Typed, validated access to environment variables. Public values are inlined
 * by Next.js at build time; server-only values must never be imported by a
 * Client Component (enforced by `server-only` in src/lib/env.server.ts).
 */
export function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return {
    supabaseUrl: url && url.length > 0 ? url : undefined,
    supabaseKey: key && key.length > 0 ? key : undefined,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  };
}

/** Names of the required public variables that are missing from this build. */
export function missingSupabaseEnv(): string[] {
  const env = publicEnv();
  const missing: string[] = [];
  if (!env.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!env.supabaseKey) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return missing;
}

export function isSupabaseConfigured() {
  const env = publicEnv();
  return Boolean(env.supabaseUrl && env.supabaseKey);
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function requireSupabaseEnv() {
  const env = publicEnv();
  if (!env.supabaseUrl || !env.supabaseKey) {
    throw new ConfigurationError(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
  }
  return { url: env.supabaseUrl, key: env.supabaseKey };
}
