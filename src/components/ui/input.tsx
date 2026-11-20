import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const controlClasses = cn(
  "w-full rounded-md bg-paper px-3 text-sm text-ink shadow-hairline",
  "placeholder:text-ink-4 transition-shadow duration-150",
  "hover:shadow-[0_0_0_1px_rgb(23_23_23/0.14)]",
  "focus:outline-none focus-visible:outline-none focus:shadow-[0_0_0_1px_var(--color-gold),0_0_0_4px_var(--color-gold-soft)]",
  "aria-[invalid=true]:shadow-[0_0_0_1px_var(--color-danger)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(controlClasses, "h-10", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 4, ...props },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(controlClasses, "py-2.5 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        controlClasses,
        "h-10 appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b675f' stroke-width='1.75'%3E%3Cpath d='m7 10 5 5 5-5'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
