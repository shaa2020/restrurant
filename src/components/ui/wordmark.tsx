import Link from "next/link";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/cn";

export function Wordmark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-baseline gap-1.5 text-ink", className)} aria-label={`${brand.name} home`}>
      <span className="font-display text-[26px] leading-none">{brand.name}</span>
      <span aria-hidden className="mb-0.5 size-1.5 rounded-full bg-gold" />
    </Link>
  );
}
