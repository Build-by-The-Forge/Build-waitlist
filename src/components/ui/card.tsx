import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-surface ring-1 ring-border-subtle shadow-[0_1px_2px_rgba(15,16,19,0.04),0_12px_32px_-20px_rgba(15,16,19,0.18)]",
        className,
      )}
      {...props}
    />
  );
}
