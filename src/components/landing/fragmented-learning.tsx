"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Bot, FileQuestion, FileText, LayoutGrid, MessageCircle, NotebookPen, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Spark } from "@/components/ui/logo";
import { useScrollRange } from "@/components/motion/use-scroll-range";

type Fragment = { label: string; short: string; icon: ReactNode; x: number; y: number; rotate: number; badge?: string };

// x/y: centre point as a percentage of the (square) stage.
const fragments: Fragment[] = [
  { label: "Lecture notes", short: "Notes", icon: <NotebookPen />, x: 24, y: 14, rotate: -6 },
  { label: "PDFs", short: "PDFs", icon: <FileText />, x: 74, y: 16, rotate: 5, badge: "14" },
  { label: "WhatsApp groups", short: "Groups", icon: <MessageCircle />, x: 76, y: 46, rotate: -4, badge: "99+" },
  { label: "YouTube", short: "Videos", icon: <PlayCircle />, x: 68, y: 80, rotate: 6, badge: "6" },
  { label: "LMS", short: "Courses", icon: <LayoutGrid />, x: 22, y: 64, rotate: 4, badge: "3" },
  { label: "Past questions", short: "Practice", icon: <FileQuestion />, x: 34, y: 88, rotate: -5 },
  { label: "AI tools", short: "AI", icon: <Bot />, x: 48, y: 36, rotate: 3 },
];

// Where each fragment settles once connected: evenly around BUILD.
const RING_RADIUS = 38;
const ring = fragments.map((_, i) => {
  const angle = (-90 + (360 / fragments.length) * i) * (Math.PI / 180);
  return { x: 50 + RING_RADIUS * Math.cos(angle), y: 50 + RING_RADIUS * Math.sin(angle) };
});

// Scroll timeline (0 → 1 across the pinned section).
const T = {
  converge: [0.1, 0.32] as const, // start of first fragment, duration
  mark: [0.48, 0.64] as const,
  resolution: [0.6, 0.7] as const,
  spokes: [0.66, 0.82] as const,
  nodes: [0.72, 0.88] as const,
};

const copy = {
  label: "The problem",
  heading: "Learning is fragmented.",
  body: "Your notes are somewhere. Your lectures are somewhere else. Practice questions live somewhere else. And your AI doesn't know how any of it connects.",
};

function Chip({ fragment }: { fragment: Fragment }) {
  return (
    <span className="relative flex items-center gap-2 rounded-full bg-surface py-2 pr-4 pl-2.5 text-sm font-medium whitespace-nowrap ring-1 ring-border shadow-[0_10px_24px_-14px_rgba(15,16,19,0.35)]">
      <span className="text-foreground-subtle [&_svg]:size-4">{fragment.icon}</span>
      {fragment.label}
      {fragment.badge && (
        <span className="absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[0.625rem] font-semibold text-white ring-2 ring-background">
          {fragment.badge}
        </span>
      )}
    </span>
  );
}

function FloatingFragment({ fragment, progress, index }: { fragment: Fragment; progress: MotionValue<number>; index: number }) {
  // Staggered convergence: each fragment starts pulling in slightly after the previous one.
  const start = T.converge[0] + index * 0.025;
  const t = useScrollRange(progress, [start, start + T.converge[1]], [0, 1]);
  const x = useTransform(t, (v) => `${(50 - fragment.x) * v * v}cqw`);
  const y = useTransform(t, (v) => `${(50 - fragment.y) * v * v}cqw`);
  const rotate = useTransform(t, [0, 1], [fragment.rotate, 0]);
  const scale = useTransform(t, [0, 0.8, 1], [1, 0.7, 0.35]);
  const opacity = useTransform(t, [0, 0.75, 1], [1, 0.9, 0]);

  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${fragment.x}%`, top: `${fragment.y}%` }}>
      <motion.div style={{ x, y, rotate, scale, opacity }}>
        <Chip fragment={fragment} />
      </motion.div>
    </div>
  );
}

/** The payoff: the same sources, now connected through BUILD. */
function ConnectedRing({ progress }: { progress: MotionValue<number> }) {
  const draw = useTransform(progress, [...T.spokes], [0, 1]);
  const lineOpacity = useScrollRange(progress, [T.spokes[0], T.spokes[0] + 0.02], [0, 1]);
  const nodeOpacity = useScrollRange(progress, T.nodes, [0, 1]);
  const nodeScale = useScrollRange(progress, T.nodes, [0.85, 1]);

  return (
    <>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible">
        <motion.circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="0.25"
          strokeDasharray="0.6 1.4"
          style={{ opacity: nodeOpacity }}
        />
        {ring.map((p, i) => (
          <motion.path
            key={i}
            d={`M50 50 L${p.x} ${p.y}`}
            stroke="var(--color-accent)"
            strokeWidth="0.35"
            strokeLinecap="round"
            style={{ pathLength: draw, opacity: lineOpacity }}
          />
        ))}
      </svg>
      {fragments.map((f, i) => (
        <div key={f.label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${ring[i].x}%`, top: `${ring[i].y}%` }}>
          <motion.span
            style={{ opacity: nodeOpacity, scale: nodeScale }}
            className="flex items-center gap-1.5 rounded-full bg-surface py-1.5 pr-3 pl-2 text-xs font-medium whitespace-nowrap ring-1 ring-border-subtle shadow-[0_8px_20px_-14px_rgba(15,16,19,0.4)]"
          >
            <span className="text-accent-strong [&_svg]:size-3.5">{f.icon}</span>
            {f.short}
          </motion.span>
        </div>
      ))}
    </>
  );
}

function BuildMark({ progress }: { progress: MotionValue<number> }) {
  const [from, to] = T.mark;
  const opacity = useScrollRange(progress, [from, from + (to - from) * 0.8], [0, 1]);
  const scale = useScrollRange(progress, [from, to], [0.6, 1]);
  const pulse = useScrollRange(progress, [from + 0.04, to + 0.12], [0.8, 1.5]);
  // Full 0 → 1 keyframes for the same reason as useScrollRange.
  const pulseOpacity = useTransform(progress, [0, from + 0.04, to, to + 0.12, 1], [0, 0, 0.5, 0, 0]);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <motion.span style={{ scale: pulse, opacity: pulseOpacity }} className="absolute -inset-8 rounded-[36px] ring-1 ring-accent" />
      <motion.div style={{ opacity, scale }}>
        <span className="grid size-20 place-items-center rounded-[24px] bg-primary text-accent shadow-[0_30px_60px_-24px_rgba(15,16,19,0.6)] sm:size-24">
          <Spark className="size-8 sm:size-9" />
        </span>
      </motion.div>
    </div>
  );
}

function Resolution({ progress }: { progress: MotionValue<number> }) {
  const opacity = useScrollRange(progress, T.resolution, [0, 1]);
  const y = useScrollRange(progress, T.resolution, [16, 0]);
  return (
    <motion.p style={{ opacity, y }} className="mt-6 text-body font-medium text-foreground">
      BUILD brings it together, and understands how it connects.
    </motion.p>
  );
}

function Intro({ children }: { children?: ReactNode }) {
  return (
    <div className="max-w-xl">
      <Badge>{copy.label}</Badge>
      <h2 id="problem-heading" className="mt-5 text-heading text-balance">
        {copy.heading}
      </h2>
      <p className="mt-6 text-body text-foreground-muted text-pretty">{copy.body}</p>
      {children}
    </div>
  );
}

export function FragmentedLearning() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  if (reduceMotion) {
    return (
      <section id="problem" aria-labelledby="problem-heading" className="py-24 sm:py-32">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <Intro>
            <p className="mt-6 text-body font-medium">BUILD brings it together, and understands how it connects.</p>
          </Intro>
          <div className="flex flex-col items-center gap-8">
            <ul className="flex flex-wrap justify-center gap-2">
              {fragments.map((f) => (
                <li key={f.label}>
                  <Chip fragment={f} />
                </li>
              ))}
            </ul>
            <span className="grid size-20 place-items-center rounded-3xl bg-primary text-accent">
              <Spark className="size-8" />
            </span>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section id="problem" ref={ref} aria-labelledby="problem-heading" className="relative h-[320vh]">
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <Container className="grid items-center gap-8 pt-16 lg:grid-cols-2 lg:gap-16 lg:pt-0">
          <Intro>
            <Resolution progress={scrollYProgress} />
          </Intro>

          <div
            aria-hidden="true"
            className="relative mx-auto aspect-square w-full max-w-[min(100%,44svh)] [container-type:inline-size] lg:max-w-[min(100%,72svh)]"
          >
            <ConnectedRing progress={scrollYProgress} />
            {fragments.map((f, i) => (
              <FloatingFragment key={f.label} fragment={f} progress={scrollYProgress} index={i} />
            ))}
            <BuildMark progress={scrollYProgress} />
          </div>
        </Container>
      </div>
      {/* Screen readers get the list without depending on scroll position. */}
      <ul className="sr-only">
        {fragments.map((f) => (
          <li key={f.label}>{f.label}</li>
        ))}
      </ul>
    </section>
  );
}
