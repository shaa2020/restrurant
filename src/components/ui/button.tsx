import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
export type ButtonSize = "sm" | "md" | "lg" | "touch";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-ivory hover:bg-ink-2 active:bg-ink",
  secondary: "bg-paper text-ink shadow-raised hover:bg-stone-100",
  ghost: "text-ink-2 hover:bg-stone-100 hover:text-ink",
  danger: "bg-danger text-white hover:bg-[#8b3426]",
  accent: "bg-gold-soft text-gold-ink hover:bg-[#e4d9c6]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-sm",
  md: "h-10 px-4 text-sm gap-2 rounded-md",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-md",
  touch: "h-14 px-6 text-base gap-2.5 rounded-lg", // POS / KDS: ≥ 48px targets
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap font-medium",
    "transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.985]",
    "disabled:pointer-events-none disabled:opacity-45",
    variants[variant],
    sizes[size],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
});
