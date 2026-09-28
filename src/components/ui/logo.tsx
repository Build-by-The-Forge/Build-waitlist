import { cn } from "@/lib/utils";

/** The BUILD spark: a four-point star, the "connection point" motif used across the site. */
export function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4", className)}>
      <path
        fill="currentColor"
        d="M12 1.5c.5 4.9 2.2 7.8 4.6 9.1 1.4.7 3.2 1.1 5.9 1.4-2.7.3-4.5.7-5.9 1.4-2.4 1.3-4.1 4.2-4.6 9.1-.5-4.9-2.2-7.8-4.6-9.1C6 12.7 4.2 12.3 1.5 12c2.7-.3 4.5-.7 5.9-1.4C9.8 9.3 11.5 6.4 12 1.5Z"
      />
    </svg>
  );
}

export function Logo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "grid size-7 place-items-center rounded-[9px]",
          inverse ? "bg-ink-foreground text-accent" : "bg-primary text-accent",
        )}
      >
        <Spark className="size-3.5" />
      </span>
      <span className="text-[1.0625rem] font-semibold tracking-[0.08em]">BUILD</span>
    </span>
  );
}
