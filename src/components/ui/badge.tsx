import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "gold" | "sage" | "success" | "warning" | "danger" | "outline";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-stone-100 text-ink-2",
  gold: "bg-gold-soft text-gold-ink",
  sage: "bg-sage-soft text-sage-ink",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  outline: "text-ink-2 shadow-[inset_0_0_0_1px_var(--color-stone-300)]",
};

export function Badge({ tone = "neutral", dot = false, className, children, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; dot?: boolean }) {
  return (
    <span
      className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}
      {...props}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
