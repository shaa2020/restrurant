import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/ui";
import { getTenantContext, requireUser } from "@/lib/auth";
import { getPlans } from "@/lib/plans";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your restaurant" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  await requireUser("/onboarding");
  const { new: addAnother } = await searchParams;
  // Existing members go to their dashboard unless they explicitly add another restaurant.
  if (!addAnother && (await getTenantContext())) redirect("/dashboard");

  const plans = (await getPlans())
    .filter((p): p is typeof p & { price_cents: number } => p.price_cents !== null)
    .map(({ id, name, description, price_cents, trial_days }) => ({ id, name, description, price_cents, trial_days }));

  return (
    <div className="min-h-dvh px-4 py-8 sm:px-8">
      <Wordmark />
      <main className="mx-auto max-w-xl py-14 animate-rise-in">
        <p className="text-xs font-medium tracking-[0.08em] text-gold-ink uppercase">Welcome</p>
        <h1 className="mt-2 font-display text-[44px] leading-[1.05]">Let&apos;s set the table.</h1>
        <p className="mt-3 mb-12 text-[15px] leading-relaxed text-ink-3">
          A few details about your restaurant. You can refine everything later in settings.
        </p>
        <OnboardingForm plans={plans} />
      </main>
    </div>
  );
}
