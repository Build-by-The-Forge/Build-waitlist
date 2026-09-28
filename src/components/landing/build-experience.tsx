import type { ReactNode } from "react";
import { ArrowRight, BookOpen, FileQuestion, NotebookPen, Search } from "lucide-react";
import { Section } from "@/components/ui/container";
import { Spark } from "@/components/ui/logo";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

function StepCard({
  step,
  name,
  line,
  className,
  children,
}: {
  step: string;
  name: string;
  line: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <StaggerItem className={cn("relative flex flex-col overflow-hidden rounded-3xl bg-surface ring-1 ring-border-subtle", className)}>
      <div className="p-6 sm:p-8">
        <p className="font-mono text-xs tracking-[0.14em] text-foreground-subtle">{step}</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{name}</h3>
        <p className="mt-2 text-foreground-muted">{line}</p>
      </div>
      <div aria-hidden="true" className="mt-auto px-6 pb-6 sm:px-8 sm:pb-8">
        {children}
      </div>
    </StaggerItem>
  );
}

function ExploreVisual() {
  const results = [
    { icon: <BookOpen />, title: "Recursion", meta: "Topic · CSC 101" },
    { icon: <NotebookPen />, title: "Week 6 notes", meta: "Your notes" },
    { icon: <FileQuestion />, title: "Past question 4", meta: "Practice" },
  ];
  return (
    <div className="rounded-2xl bg-surface-muted p-3">
      <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm ring-1 ring-border-subtle">
        <Search className="size-4 text-foreground-subtle" />
        <span>recursion</span>
        <span className="h-4 w-px animate-pulse bg-foreground" />
      </div>
      <ul className="mt-2 space-y-1">
        {results.map((r) => (
          <li key={r.title} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm">
            <span className="text-foreground-subtle [&_svg]:size-4">{r.icon}</span>
            <span className="font-medium">{r.title}</span>
            <span className="ml-auto text-xs text-foreground-subtle">{r.meta}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LearnVisual() {
  return (
    <div className="space-y-2 rounded-2xl bg-surface-muted p-3 text-sm">
      <div className="rounded-xl bg-surface p-3 ring-1 ring-border-subtle">
        <p className="text-xs text-foreground-subtle">Week 6 · Lecture slides</p>
        <p className="mt-1 font-medium">A function that calls itself on a smaller input.</p>
      </div>
      <div className="ml-6 rounded-xl rounded-tl-sm bg-primary p-3 text-primary-foreground">
        <p className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Spark className="size-3 text-accent" /> BUILD
        </p>
        <p className="mt-1">Like the stack of plates from class: solve the top one, then the rest.</p>
      </div>
    </div>
  );
}

function HomeVisual() {
  const week = [0.9, 0.6, 1, 0.4, 0.75, 0.2, 0];
  return (
    <div className="grid gap-3 rounded-2xl bg-surface-muted p-3 sm:grid-cols-[1.4fr_1fr_1fr]">
      <div className="rounded-xl bg-surface p-4 ring-1 ring-border-subtle">
        <p className="text-xs text-foreground-subtle">Continue where you left off</p>
        <p className="mt-1 font-semibold">Recursion · CSC 101</p>
        <div className="mt-3 h-1.5 rounded-full bg-surface-muted">
          <div className="h-full w-3/5 rounded-full bg-accent" />
        </div>
        <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium">
          Resume <ArrowRight className="size-3" />
        </p>
      </div>
      <div className="rounded-xl bg-surface p-4 ring-1 ring-border-subtle">
        <p className="text-xs text-foreground-subtle">This week</p>
        <div className="mt-3 flex h-14 items-end gap-1.5">
          {week.map((h, i) => (
            <span key={i} className={cn("flex-1 rounded-[3px]", i === 4 ? "bg-accent" : "bg-foreground/15")} style={{ height: `${Math.max(h * 100, 8)}%` }} />
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-surface p-4 ring-1 ring-border-subtle">
        <p className="text-xs text-foreground-subtle">Up next</p>
        <p className="mt-1 text-sm font-semibold">Practice test</p>
        <p className="text-xs text-foreground-subtle">Loops &amp; recursion</p>
      </div>
    </div>
  );
}

function SocialVisual() {
  return (
    <div className="space-y-2 rounded-2xl bg-surface-muted p-3 text-sm">
      <p className="px-1 text-xs font-medium text-foreground-subtle"># csc101-study-circle</p>
      <div className="flex gap-2.5 rounded-xl bg-surface p-3 ring-1 ring-border-subtle">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-muted text-xs font-semibold text-accent-strong">T</span>
        <p>Anyone else stuck on the base case for Q3?</p>
      </div>
      <div className="flex gap-2.5 rounded-xl bg-surface p-3 ring-1 ring-border-subtle">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-semibold">K</span>
        <p>Think about when n reaches 1. That&rsquo;s where it stops.</p>
      </div>
    </div>
  );
}

function MotivationVisual() {
  const goals = [
    { label: "Understand recursion", done: true },
    { label: "Finish practice set", done: true },
    { label: "Review loops", done: false },
  ];
  return (
    <ul className="space-y-2 rounded-2xl bg-surface-muted p-3 text-sm">
      {goals.map((g) => (
        <li key={g.label} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-border-subtle">
          <span className={cn("grid size-5 place-items-center rounded-full ring-1", g.done ? "bg-success text-white ring-success" : "ring-border")}>
            {g.done && (
              <svg viewBox="0 0 12 12" className="size-3">
                <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className={cn(g.done && "text-foreground-subtle line-through")}>{g.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Small vertical connector between rows: the "one continuous journey" thread. */
function Thread({ fork = false }: { fork?: boolean }) {
  return (
    <div aria-hidden="true" className="relative col-span-full hidden h-10 md:block">
      <span className="absolute top-0 left-1/2 h-full w-px bg-border" />
      <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
      {fork && <span className="absolute bottom-0 left-1/4 h-px w-1/2 bg-border" />}
    </div>
  );
}

export function BuildExperience() {
  return (
    <Section
      id="experience"
      label="One experience"
      heading="Everything you need to keep learning."
      intro="Five parts of BUILD, designed as one continuous journey. Each flows into the next, so nothing you learn gets lost between apps."
    >
      <Stagger className="mt-16 grid gap-4 md:grid-cols-2" gap={0.1}>
        <StepCard step="01" name="Explore" line="Discover what matters.">
          <ExploreVisual />
        </StepCard>
        <StepCard step="02" name="Learn" line="Understand your courses and materials.">
          <LearnVisual />
        </StepCard>

        <Thread />

        <StepCard step="03" name="Home" line="See your learning journey at a glance." className="md:col-span-2">
          <HomeVisual />
        </StepCard>

        <Thread fork />

        <StepCard step="04" name="Social" line="Learn alongside people who are on the same journey.">
          <SocialVisual />
        </StepCard>
        <StepCard step="05" name="Motivation" line="Keep moving forward.">
          <MotivationVisual />
        </StepCard>
      </Stagger>
    </Section>
  );
}
