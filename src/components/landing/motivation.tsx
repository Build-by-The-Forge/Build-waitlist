import type { CSSProperties } from "react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const TOTAL = 20;
const FILLED = 18;

const stats = [
  { value: 4, label: "topics understood" },
  { value: 3, label: "practice sessions" },
  { value: 2, label: "goals completed" },
];

export function Motivation() {
  return (
    <section id="motivation" aria-labelledby="motivation-heading" className="py-24 sm:py-32">
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <h2 id="motivation-heading" className="text-heading">
            Keep going.
          </h2>
          <p className="mt-6 max-w-md text-body text-foreground-muted">
            Progress you can actually see: what you&rsquo;ve understood, what you&rsquo;ve practised, and what&rsquo;s
            next. Motivation that comes from learning, not from chasing points.
          </p>
        </Reveal>

        <Reveal variant="scale" delay={0.1}>
          <div className="rounded-3xl bg-surface p-6 ring-1 ring-border-subtle sm:p-10">
            <p className="text-small text-foreground-subtle">Your learning progress</p>
            <div className="mt-5 flex gap-1 sm:gap-1.5" role="img" aria-label={`${FILLED} of ${TOTAL} milestones reached`}>
              {Array.from({ length: TOTAL }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "grow-bar h-8 flex-1 rounded-[4px] sm:h-10",
                    i === FILLED - 1 ? "bg-accent" : i < FILLED ? "bg-foreground" : "bg-surface-muted",
                  )}
                  style={{ "--i": i } as CSSProperties}
                />
              ))}
            </div>
            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-border-subtle pt-6">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-3xl font-semibold tracking-tight sm:text-4xl">{s.value}</dd>
                  <dd className="mt-1 text-small text-foreground-muted" aria-hidden="true">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-6 text-center font-serif text-2xl italic sm:text-3xl">Small progress compounds.</p>
        </Reveal>
      </Container>
    </section>
  );
}
