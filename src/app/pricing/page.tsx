import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Alert, buttonClasses, Wordmark } from "@/components/ui";
import { ConfigNotice } from "@/components/config-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { getPlans, type Plan } from "@/lib/plans";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

async function loadPlans(): Promise<{ plans: Plan[]; error?: string }> {
  if (!isSupabaseConfigured()) return { plans: [] };
  try {
    return { plans: await getPlans() };
  } catch (e) {
    console.error(e);
    return { plans: [], error: "Plans couldn't be loaded right now. Please try again shortly." };
  }
}

export default async function PricingPage() {
  const { plans, error } = await loadPlans();
  const salesEmail = process.env.NEXT_PUBLIC_SALES_EMAIL;
  return (
    <div className="min-h-dvh px-4 py-6 sm:px-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Wordmark />
        <Link href="/sign-in" className={buttonClasses("ghost", "sm")}>Sign in</Link>
      </header>
      <main className="mx-auto max-w-6xl py-20">
        <h1 className="font-display text-5xl sm:text-6xl">Simple, honest pricing.</h1>
        <p className="mt-4 max-w-lg text-[15px] text-ink-3">Prices exclude VAT. Every self-serve plan includes a free trial, no card required.</p>
        <div className="mt-12 flex flex-col gap-4">
          {!isSupabaseConfigured() && <ConfigNotice />}
          {error && <Alert tone="danger">{error}</Alert>}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const featured = p.id === "professional";
            return (
              <section key={p.id} className={cn("flex flex-col gap-6 rounded-lg p-6", featured ? "bg-ink text-ivory" : "bg-paper shadow-raised")}>
                <div className="flex flex-col gap-2">
                  <h2 className="text-[15px] font-medium">{p.name}</h2>
                  <p className={cn("text-sm", featured ? "text-ivory/65" : "text-ink-3")}>{p.description}</p>
                </div>
                <p className="font-display text-5xl tabular">
                  {p.price_cents === null ? "Custom" : formatMoney(p.price_cents, p.currency)}
                  {p.price_cents !== null && <span className={cn("ml-1 font-sans text-sm", featured ? "text-ivory/60" : "text-ink-3")}>/ month</span>}
                </p>
                <ul className="flex flex-1 flex-col gap-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f.key} className="flex items-start gap-2">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" strokeWidth={2} />
                      {f.name}
                    </li>
                  ))}
                  {p.limits.branches && (
                    <li className={cn("pt-2 text-[13px]", featured ? "text-ivory/60" : "text-ink-3")}>
                      Up to {p.limits.branches} location{p.limits.branches > 1 ? "s" : ""}
                    </li>
                  )}
                </ul>
                {p.price_cents === null ? (
                  salesEmail ? (
                    <a href={`mailto:${salesEmail}`} className={buttonClasses("secondary", "md", "w-full")}>Talk to us</a>
                  ) : null
                ) : (
                  <Link href="/sign-up" className={buttonClasses(featured ? "accent" : "primary", "md", "w-full")}>Start free trial</Link>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
