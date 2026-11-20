import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Plan = {
  id: string;
  name: string;
  description: string;
  price_cents: number | null;
  currency: string;
  trial_days: number;
  limits: { branches?: number; staff_seats?: number };
  features: { key: string; name: string }[];
};

/** Public plan catalogue, read from the database (prices are data, not code). */
export async function getPlans(): Promise<Plan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, description, price_cents, currency, trial_days, limits, plan_features(feature:features(key, name))")
    .eq("is_public", true)
    .order("sort_order");
  if (error) throw new Error(`Could not load plans: ${error.message}`);
  type Row = Omit<Plan, "features"> & { plan_features: { feature: { key: string; name: string } }[] };
  return ((data ?? []) as unknown as Row[]).map(({ plan_features, ...p }) => ({
    ...p,
    features: plan_features.map((pf) => pf.feature),
  }));
}
