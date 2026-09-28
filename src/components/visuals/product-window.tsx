import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * App-window frame for product mockups. Everything shown inside is an
 * illustrative marketing visual, not a live connection to BUILD's services.
 */
export function ProductWindow({
  title = "BUILD",
  browserControls = true,
  toolbar,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  browserControls?: boolean;
  toolbar?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[22px] bg-surface ring-1 ring-border shadow-[0_2px_4px_rgba(15,16,19,0.04),0_32px_64px_-32px_rgba(15,16,19,0.28)]",
        className,
      )}
    >
      <div className="flex h-11 items-center gap-3 border-b border-border-subtle bg-surface-muted/60 px-4">
        {browserControls && (
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
          </div>
        )}
        <p className="flex-1 truncate text-center font-mono text-[0.6875rem] tracking-wide text-foreground-subtle">{title}</p>
        <div className="min-w-[42px] text-right">{toolbar}</div>
      </div>
      <div className={cn("relative", bodyClassName)}>{children}</div>
    </div>
  );
}
