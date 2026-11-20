"use client";
import { useActionState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { signUp, type AuthState } from "../actions";

export function SignUpForm() {
  const [state, action] = useActionState<AuthState, FormData>(signUp, {});

  if (state.notice) {
    return (
      <div className="flex flex-col items-start gap-4 animate-rise-in">
        <MailCheck aria-hidden className="size-6 text-gold" strokeWidth={1.5} />
        <h2 className="font-display text-3xl">Check your inbox</h2>
        <p className="text-[15px] leading-relaxed text-ink-3">{state.notice}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label="Your name" error={state.fieldErrors?.fullName}>
        <Input name="fullName" autoComplete="name" required autoFocus />
      </Field>
      <Field label="Work email" error={state.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" defaultValue={state.email} required />
      </Field>
      <Field label="Password" hint="At least 10 characters, with letters and a number." error={state.fieldErrors?.password}>
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-2.5 text-sm text-ink-2">
          <input name="terms" type="checkbox" className="mt-0.5 size-4 accent-ink" aria-invalid={state.fieldErrors?.terms ? true : undefined} />
          <span>I agree to the terms of service and the processing of my data as described in the privacy policy.</span>
        </label>
        {state.fieldErrors?.terms && <p className="text-[13px] text-danger">{state.fieldErrors.terms}</p>}
      </div>
      <SubmitButton size="lg" className="mt-1 w-full">
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-ink-3">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-ink underline decoration-gold underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
