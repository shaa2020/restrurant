import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl">Welcome back</h1>
        <p className="text-[15px] text-ink-3">Sign in to manage your restaurant.</p>
      </div>
      {error === "link" && <Alert tone="warning">That link is invalid or has expired. Please sign in or request a new one.</Alert>}
      <SignInForm next={next} />
    </>
  );
}
