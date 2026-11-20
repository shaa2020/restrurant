"use client";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";

/** Submit button that shows a pending state while its form's server action runs. */
export function SubmitButton({ children, ...props }: Omit<ButtonProps, "type" | "loading">) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {children}
    </Button>
  );
}
