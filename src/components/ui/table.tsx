import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Data table primitives — hairline rows, no zebra striping, tabular numbers. */
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}
export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("h-10 border-b border-stone-200 px-3 text-left text-xs font-medium text-ink-3 first:pl-0 last:pr-0", className)} {...props} />;
}
export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("h-12 border-b border-stone-200 px-3 text-ink-2 first:pl-0 last:pr-0 tabular", className)} {...props} />;
}
