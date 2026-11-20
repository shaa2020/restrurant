import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, description, action }: { icon?: LucideIcon; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-stone-300 px-6 py-14 text-center">
      {Icon && <Icon aria-hidden className="size-5 text-gold" strokeWidth={1.5} />}
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-[15px] font-medium text-ink">{title}</p>
        {description && <p className="text-sm leading-relaxed text-ink-3">{description}</p>}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
