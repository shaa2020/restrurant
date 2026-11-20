import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "danger";

const styles: Record<Tone, { box: string; Icon: typeof Info }> = {
  info: { box: "bg-paper text-ink-2 shadow-hairline", Icon: Info },
  success: { box: "bg-success-soft text-success", Icon: CheckCircle2 },
  warning: { box: "bg-warning-soft text-warning", Icon: TriangleAlert },
  danger: { box: "bg-danger-soft text-danger", Icon: AlertCircle },
};

export function Alert({ tone = "info", title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  const { box, Icon } = styles[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-md px-4 py-3 text-sm", box, className)}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}
