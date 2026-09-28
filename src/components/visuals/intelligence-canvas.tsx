import type { CSSProperties, ReactNode } from "react";
import { BookOpen, ListChecks, Route, TrendingUp } from "lucide-react";
import { Spark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/**
 * Hero visual: BUILD connecting course, practice and progress through BUILD AI
 * into the student's journey. Pure CSS/SVG: no client JS, and every animation
 * is switched off by the global prefers-reduced-motion rule.
 *
 * Positions are percentages of the canvas, with one layout for wide screens
 * (flowing left to right) and one for phones (flowing top to bottom).
 */
type Point = [x: number, y: number];
type NodeId = "build" | "course" | "practice" | "progress" | "ai" | "journey";

const wide: Record<NodeId, Point> = {
  build: [7, 50],
  course: [31, 17],
  practice: [31, 50],
  progress: [31, 83],
  ai: [61, 50],
  journey: [89, 50],
};

const tall: Record<NodeId, Point> = {
  build: [50, 7],
  course: [17, 35],
  practice: [50, 35],
  progress: [83, 35],
  ai: [50, 65],
  journey: [50, 92],
};

const edges: [NodeId, NodeId][] = [
  ["build", "course"],
  ["build", "practice"],
  ["build", "progress"],
  ["course", "ai"],
  ["practice", "ai"],
  ["progress", "ai"],
  ["ai", "journey"],
];

function curve([x1, y1]: Point, [x2, y2]: Point, direction: "x" | "y") {
  if (direction === "x") {
    const mx = (x1 + x2) / 2;
    return `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
  }
  const my = (y1 + y2) / 2;
  return `M${x1} ${y1} C${x1} ${my} ${x2} ${my} ${x2} ${y2}`;
}

function Connections({ layout, direction, className }: { layout: Record<NodeId, Point>; direction: "x" | "y"; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("absolute inset-0 size-full", className)}>
      {edges.map(([from, to]) => {
        const d = curve(layout[from], layout[to], direction);
        return (
          <g key={`${from}-${to}`}>
            <path d={d} fill="none" stroke="var(--color-border)" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
            <path
              d={d}
              fill="none"
              stroke="var(--color-accent)"
              strokeOpacity={0.75}
              strokeWidth={1.5}
              strokeDasharray="3 13"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="animate-flow"
            />
          </g>
        );
      })}
    </svg>
  );
}

function Positioned({ id, children, delay }: { id: NodeId; children: ReactNode; delay: number }) {
  const style = {
    "--wx": `${wide[id][0]}%`,
    "--wy": `${wide[id][1]}%`,
    "--tx": `${tall[id][0]}%`,
    "--ty": `${tall[id][1]}%`,
    animationDelay: `${delay}s`,
  } as CSSProperties;
  return (
    <div
      style={style}
      className="absolute top-(--ty) left-(--tx) -translate-x-1/2 -translate-y-1/2 animate-rise md:top-(--wy) md:left-(--wx)"
    >
      <div className="animate-float" style={{ animationDelay: `${delay * 2.3}s`, animationDuration: `${8 + delay * 3}s` }}>
        {children}
      </div>
    </div>
  );
}

function NodeCard({ icon, label, detail }: { icon: ReactNode; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-surface p-2 pr-3 ring-1 ring-border-subtle shadow-[0_12px_28px_-16px_rgba(15,16,19,0.35)] sm:gap-3 sm:p-2.5 sm:pr-4">
      <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-surface-muted text-foreground sm:size-9 [&_svg]:size-3.5 sm:[&_svg]:size-4">
        {icon}
      </span>
      <span className="leading-tight">
        <span className="block text-[0.75rem] font-semibold whitespace-nowrap sm:text-sm">{label}</span>
        <span className="hidden text-xs whitespace-nowrap text-foreground-subtle md:block">{detail}</span>
      </span>
    </div>
  );
}

export function IntelligenceCanvas({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative mx-auto aspect-[4/5] w-full max-w-md select-none sm:aspect-[5/4] md:aspect-[21/8] md:max-w-none", className)}
    >
      <Connections layout={tall} direction="y" className="md:hidden" />
      <Connections layout={wide} direction="x" className="hidden md:block" />

      <Positioned id="build" delay={0.1}>
        <div className="grid size-12 place-items-center rounded-2xl bg-primary text-accent shadow-[0_16px_32px_-12px_rgba(15,16,19,0.55)] sm:size-14">
          <Spark className="size-5 sm:size-6" />
        </div>
      </Positioned>

      <Positioned id="course" delay={0.25}>
        <NodeCard icon={<BookOpen />} label="Course" detail="CSC 101 · Week 6" />
      </Positioned>
      <Positioned id="practice" delay={0.35}>
        <NodeCard icon={<ListChecks />} label="Practice" detail="Recursion · 10 questions" />
      </Positioned>
      <Positioned id="progress" delay={0.45}>
        <NodeCard icon={<TrendingUp />} label="Progress" detail="4 topics understood" />
      </Positioned>

      <Positioned id="ai" delay={0.6}>
        <div className="relative">
          <span className="absolute -inset-3 animate-pulse-soft rounded-full bg-accent/15" />
          <div className="relative flex items-center gap-2 rounded-full bg-primary py-2.5 pr-5 pl-3 text-primary-foreground shadow-[0_20px_40px_-16px_rgba(15,16,19,0.6)] sm:py-3">
            <Spark className="size-4 text-accent" />
            <span className="text-sm font-semibold whitespace-nowrap">BUILD AI</span>
          </div>
        </div>
      </Positioned>

      <Positioned id="journey" delay={0.75}>
        <div className="rounded-2xl bg-surface p-3 ring-1 ring-border-subtle shadow-[0_12px_28px_-16px_rgba(15,16,19,0.35)] sm:p-3.5">
          <div className="flex items-center gap-2">
            <Route className="size-3.5 text-accent-strong" />
            <span className="text-[0.75rem] font-semibold whitespace-nowrap sm:text-sm">Your journey</span>
          </div>
          <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-surface-muted sm:w-32">
            <div className="h-full w-[72%] rounded-full bg-accent" />
          </div>
          <p className="mt-1.5 hidden text-xs whitespace-nowrap text-foreground-subtle md:block">Next: practice recursion</p>
        </div>
      </Positioned>

      {/* Ambient UI snippets, wide screens only */}
      <div className="absolute top-[8%] left-[46%] hidden animate-rise lg:block" style={{ animationDelay: "1s" }}>
        <div className="animate-float rounded-2xl rounded-bl-md bg-surface px-3.5 py-2.5 text-xs text-foreground-muted ring-1 ring-border-subtle" style={{ animationDuration: "11s" }}>
          &ldquo;Explain this using our class example&rdquo;
        </div>
      </div>
      <div className="absolute top-[78%] left-[50%] hidden animate-rise lg:block" style={{ animationDelay: "1.15s" }}>
        <div className="animate-float flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs text-foreground-muted ring-1 ring-border-subtle" style={{ animationDuration: "10s", animationDelay: "1.5s" }}>
          <span className="size-1.5 rounded-full bg-success" />
          Grounded in your course materials
        </div>
      </div>
    </div>
  );
}
