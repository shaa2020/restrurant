import type { Metadata } from "next";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl">Open your restaurant</h1>
        <p className="text-[15px] text-ink-3">14 days free. No card required.</p>
      </div>
      <SignUpForm />
    </>
  );
}
