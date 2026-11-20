import type { ReactNode } from "react";

/** Top of every app page: serif title, one-line description, primary action on the right. */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-5 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-2xl flex-col gap-2">
        {eyebrow && <p className="text-xs font-medium tracking-[0.08em] text-gold-ink uppercase">{eyebrow}</p>}
        <h1 className="font-display text-4xl leading-[1.05] text-ink sm:text-[44px]">{title}</h1>
        {description && <p className="text-[15px] leading-relaxed text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
