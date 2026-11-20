"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error); // forwarded to error monitoring once Sentry is configured
  }, [error]);

  const config = error.name === "ConfigurationError" || error.message.includes("Supabase is not configured");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <p className="text-xs font-medium tracking-[0.08em] text-gold-ink uppercase">{config ? "Setup required" : "Something went wrong"}</p>
      <h1 className="font-display text-4xl">{config ? "The backend isn't connected yet." : "We couldn't load this page."}</h1>
      <p className="text-[15px] leading-relaxed text-ink-3">
        {config
          ? "Add your Supabase URL and publishable key to .env.local, then restart the server."
          : "Please try again. If it keeps happening, contact support and mention the reference below."}
      </p>
      {error.digest && <p className="font-mono text-xs text-ink-3">Reference: {error.digest}</p>}
      <Button variant="secondary" className="self-start" onClick={reset}>Try again</Button>
    </main>
  );
}
