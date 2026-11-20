"use client";
import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { createOrganization, type OnboardingState } from "./actions";

type PlanOption = { id: string; name: string; description: string; price_cents: number; trial_days: number };

export function OnboardingForm({ plans }: { plans: PlanOption[] }) {
  const [state, action] = useActionState<OnboardingState, FormData>(createOrganization, {});
  const v = state.values ?? {};
  const [name, setName] = useState(v.name ?? "");
  const [slug, setSlug] = useState(v.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(v.slug));
  const [plan, setPlan] = useState(v.plan ?? "professional");

  return (
    <form action={action} className="flex flex-col gap-10" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 text-xs font-medium tracking-[0.08em] text-gold-ink uppercase">Your restaurant</legend>
        <Field label="Restaurant name" error={state.fieldErrors?.name}>
          <Input
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="Bistro Amstel"
            required
            autoFocus
          />
        </Field>
        <Field label="Web address" hint={`Guests will find your menu at /r/${slug || "your-restaurant"}`} error={state.fieldErrors?.slug}>
          <Input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            spellCheck={false}
            autoCapitalize="off"
            required
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First location" error={state.fieldErrors?.branchName}>
            <Input name="branchName" defaultValue={v.branchName ?? "Centrum"} required />
          </Field>
          <Field label="City" optional error={state.fieldErrors?.city}>
            <Input name="city" defaultValue={v.city ?? ""} placeholder="Amsterdam" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-4 text-xs font-medium tracking-[0.08em] text-gold-ink uppercase">Choose a plan</legend>
        <input type="hidden" name="plan" value={plan} />
        <div role="radiogroup" aria-label="Plan" className="grid gap-3">
          {plans.map((p) => {
            const selected = plan === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPlan(p.id)}
                className={cn(
                  "flex items-center gap-4 rounded-lg bg-paper px-5 py-4 text-left transition-shadow duration-150",
                  selected ? "shadow-[0_0_0_1.5px_var(--color-ink)]" : "shadow-raised hover:shadow-[0_0_0_1px_rgb(23_23_23/0.18)]",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full transition-colors",
                    selected ? "bg-ink text-ivory" : "shadow-[inset_0_0_0_1.5px_var(--color-stone-300)]",
                  )}
                >
                  {selected && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-medium text-ink">{p.name}</span>
                  <span className="text-[13px] text-ink-3">{p.description}</span>
                </span>
                <span className="text-right tabular">
                  <span className="block text-[15px] font-medium text-ink">{formatMoney(p.price_cents)}</span>
                  <span className="text-2xs text-ink-3">per month</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[13px] text-ink-3">
          Every plan starts with a {plans[0]?.trial_days ?? 14}-day free trial. You can change plans at any time.
        </p>
      </fieldset>

      <SubmitButton size="lg" className="self-start">
        Create restaurant
      </SubmitButton>
    </form>
  );
}
