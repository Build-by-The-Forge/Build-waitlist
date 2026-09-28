import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type State = "understood" | "progress" | "next" | "later";
type TreeNode = { id: string; label: string; x: number; y: number; state: State; root?: boolean };

// Positions are percentages of the canvas.
const nodes: TreeNode[] = [
  { id: "ds", label: "Data Science", x: 50, y: 12, state: "progress", root: true },
  { id: "py", label: "Python", x: 17, y: 50, state: "understood" },
  { id: "stats", label: "Statistics", x: 50, y: 50, state: "progress" },
  { id: "ml", label: "Machine Learning", x: 83, y: 50, state: "next" },
  { id: "pandas", label: "Pandas", x: 17, y: 86, state: "understood" },
  { id: "algo", label: "Algorithms", x: 83, y: 86, state: "later" },
];

const edges: { from: string; to: string; link?: boolean }[] = [
  { from: "ds", to: "py" },
  { from: "ds", to: "stats" },
  { from: "ds", to: "ml" },
  { from: "py", to: "pandas" },
  { from: "ml", to: "algo" },
  { from: "stats", to: "ml", link: true },
];

const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

const stateStyles: Record<State, string> = {
  understood: "bg-surface ring-success/40 text-foreground",
  progress: "bg-surface ring-accent text-foreground",
  next: "bg-surface ring-foreground/25 text-foreground",
  later: "bg-surface-muted ring-border-subtle text-foreground-subtle",
};

function Dot({ state }: { state: State }) {
  if (state === "understood") return <span className="size-2 rounded-full bg-success" />;
  if (state === "progress") return <span className="size-2 rounded-full bg-accent" />;
  if (state === "next") return <span className="size-2 rounded-full ring-1 ring-foreground/40" />;
  return <span className="size-2 rounded-full bg-border" />;
}

function edgePath(a: TreeNode, b: TreeNode, link?: boolean) {
  if (link) return `M${a.x} ${a.y} C${(a.x + b.x) / 2} ${a.y + 12} ${(a.x + b.x) / 2} ${b.y + 12} ${b.x} ${b.y}`;
  const my = (a.y + b.y) / 2;
  return `M${a.x} ${a.y} C${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y}`;
}

export function KnowledgeTree({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
        {/* Edges grow top-down as the map scrolls in (CSS scroll-driven clip wipe). */}
        <div className="wipe-down absolute inset-0" aria-hidden="true">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full">
            {edges.map((e) => (
              <path
                key={`${e.from}-${e.to}`}
                d={edgePath(byId[e.from], byId[e.to], e.link)}
                fill="none"
                stroke={e.link ? "var(--color-accent)" : "color-mix(in oklab, var(--color-foreground) 22%, transparent)"}
                strokeWidth={e.link ? 1.5 : 1.25}
                strokeDasharray={e.link ? "4 5" : undefined}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>

        <ul aria-label="Data Science knowledge tree">
          {nodes.map((n, i) => (
            <li
              key={n.id}
              className="reveal-scale absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${n.x}%`, top: `${n.y}%`, "--i": i } as CSSProperties}
            >
              <span
                className={cn(
                  "flex max-w-[92px] items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-center text-[0.6875rem] leading-tight font-medium ring-1 shadow-[0_8px_20px_-14px_rgba(15,16,19,0.4)] sm:max-w-none sm:gap-2 sm:rounded-2xl sm:px-3.5 sm:py-2 sm:text-sm sm:whitespace-nowrap",
                  stateStyles[n.state],
                  n.root && "max-w-none bg-primary whitespace-nowrap text-primary-foreground ring-primary",
                )}
              >
                <Dot state={n.state} />
                {n.label}
                <span className="sr-only">
                  {" "}
                  ({n.state === "understood" ? "understood" : n.state === "progress" ? "in progress" : n.state === "next" ? "up next" : "later"})
                </span>
              </span>
            </li>
          ))}
        </ul>

        <span
          className="reveal-fade absolute top-[70%] left-[66%] hidden -translate-x-1/2 rounded-full bg-accent-muted px-2.5 py-1 text-xs font-medium text-accent-strong sm:block"
          style={{ "--i": 6 } as CSSProperties}
          aria-hidden="true"
        >
          Statistics powers ML
        </span>
      </div>

      <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-small text-foreground-muted" aria-label="Legend">
        <li className="flex items-center gap-2">
          <Dot state="understood" /> Understood
        </li>
        <li className="flex items-center gap-2">
          <Dot state="progress" /> In progress
        </li>
        <li className="flex items-center gap-2">
          <Dot state="next" /> Up next
        </li>
      </ul>
    </div>
  );
}
