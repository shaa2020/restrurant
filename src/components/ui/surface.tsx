import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A quiet raised panel. Use for grouping related content — not for decorating
 * every number. Prefer plain sections with dividers where possible.
 */
export function Surface({ className, padded = true, ...props }: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return <div className={cn("rounded-lg bg-paper shadow-raised", padded && "p-6", className)} {...props} />;
}

export function SectionHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {description && <p className="text-sm text-ink-3">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-stone-200", className)} />;
}
