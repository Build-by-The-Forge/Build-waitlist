import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function Flow({ steps, active }: { steps: readonly string[]; active?: number }) {
  return (
    <ol className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 ring-1 transition-colors duration-500",
              active === undefined
                ? "text-foreground-muted ring-border"
                : i === active
                  ? "bg-primary text-primary-foreground ring-primary"
                  : i < active
                    ? "text-foreground ring-foreground/30"
                    : "text-foreground-subtle ring-border-subtle",
            )}
          >
            {s}
          </span>
          {i < steps.length - 1 && <ChevronRight aria-hidden="true" className="size-3.5 text-foreground-subtle" />}
        </li>
      ))}
    </ol>
  );
}

export function Showcase({
  index,
  title,
  body,
  flow,
  reverse,
  children,
}: {
  index: string;
  title: string;
  body: string;
  flow: ReactNode;
  reverse?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
      <Reveal className={cn("lg:col-span-4", reverse && "lg:order-2")}>
        <p className="font-mono text-sm text-accent-strong">{index}</p>
        <h3 className="mt-3 text-[clamp(2rem,3.6vw,3.25rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance">{title}</h3>
        <p className="mt-5 text-body text-foreground-muted text-pretty">{body}</p>
        {flow}
      </Reveal>
      <Reveal variant="scale" delay={0.1} className={cn("lg:col-span-8", reverse && "lg:order-1")}>
        {children}
      </Reveal>
    </div>
  );
}
