"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { signIn, type AuthState } from "../actions";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, {});
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email" error={state.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" defaultValue={state.email} required autoFocus />
      </Field>
      <Field label="Password" error={state.fieldErrors?.password}>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton size="lg" className="mt-1 w-full">
        Sign in
      </SubmitButton>
      <p className="text-center text-sm text-ink-3">
        New to Maison?{" "}
        <Link href="/sign-up" className="font-medium text-ink underline decoration-gold underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}
