import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Section eyebrow: small, uppercase, quiet. */
export function Badge({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[0.75rem] font-medium tracking-[0.14em] text-foreground-subtle uppercase",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
      {children}
    </p>
  );
}
