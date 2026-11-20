import { useId, type ReactElement, type ReactNode, cloneElement } from "react";
import { cn } from "@/lib/cn";

type FieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  /** A single form control; it receives id / aria-* wiring automatically. */
  children: ReactElement<Record<string, unknown>>;
};

/** Label + control + hint/error, with accessible wiring. The standard way to lay out any form input. */
export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between text-[13px] font-medium text-ink-2">
        {label}
        {optional && <span className="text-2xs font-normal text-ink-3">Optional</span>}
      </label>
      {cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {error ? (
        <p id={errorId} className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[13px] text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
