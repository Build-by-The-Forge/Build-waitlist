import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-13 w-full rounded-full bg-surface px-5 text-base text-foreground ring-1 ring-border",
        "placeholder:text-foreground-subtle transition-shadow duration-200",
        "focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none",
        "aria-[invalid=true]:ring-danger",
        className,
      )}
      {...props}
    />
  );
});
