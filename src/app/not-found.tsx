import Link from "next/link";
import { buttonClasses } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <p className="text-xs font-medium tracking-[0.08em] text-gold-ink uppercase">404</p>
      <h1 className="font-display text-4xl">This table isn&apos;t set.</h1>
      <p className="text-[15px] text-ink-3">The page you were looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className={buttonClasses("secondary", "md", "self-start")}>Back to home</Link>
    </main>
  );
}
