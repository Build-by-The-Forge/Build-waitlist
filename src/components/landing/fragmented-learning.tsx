"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Bot, FileQuestion, FileText, LayoutGrid, MessageCircle, NotebookPen, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Spark } from "@/components/ui/logo";

type Fragment = { label: string; icon: ReactNode; x: number; y: number; rotate: number };

// x/y: centre point as a percentage of the (square) stage.
const fragments: Fragment[] = [
  { label: "Lecture notes", icon: <NotebookPen />, x: 24, y: 14, rotate: -6 },
  { label: "PDFs", icon: <FileText />, x: 74, y: 16, rotate: 5 },
  { label: "WhatsApp groups", icon: <MessageCircle />, x: 76, y: 46, rotate: -4 },
  { label: "YouTube", icon: <PlayCircle />, x: 68, y: 80, rotate: 6 },
  { label: "LMS", icon: <LayoutGrid />, x: 22, y: 64, rotate: 4 },
  { label: "Past questions", icon: <FileQuestion />, x: 34, y: 88, rotate: -5 },
  { label: "AI tools", icon: <Bot />, x: 48, y: 36, rotate: 3 },
];

const copy = {
  label: "The problem",
  heading: "Learning is fragmented.",
  body: "Your notes are somewhere. Your lectures are somewhere else. Practice questions live somewhere else. And your AI doesn't know how any of it connects.",
};

function Chip({ fragment }: { fragment: Fragment }) {
  return (
    <span className="flex items-center gap-2 rounded-full bg-surface py-2 pr-4 pl-2.5 text-sm font-medium whitespace-nowrap ring-1 ring-border shadow-[0_10px_24px_-14px_rgba(15,16,19,0.35)]">
      <span className="text-foreground-subtle [&_svg]:size-4">{fragment.icon}</span>
      {fragment.label}
    </span>
  );
}

function FloatingFragment({ fragment, progress, index }: { fragment: Fragment; progress: MotionValue<number>; index: number }) {
  // Staggered convergence: each fragment starts pulling in slightly after the previous one.
  const start = 0.18 + index * 0.025;
  const end = start + 0.36;
  const t = useTransform(progress, [start, end], [0, 1], { clamp: true });
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

function BuildMark({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0.55, 0.72], [0, 1]);
  const scale = useTransform(progress, [0.55, 0.78], [0.6, 1]);
  const ring = useTransform(progress, [0.6, 0.9], [0.8, 1.35]);
  const ringOpacity = useTransform(progress, [0.6, 0.75, 0.95], [0, 0.5, 0]);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <motion.span
        style={{ scale: ring, opacity: ringOpacity }}
        className="absolute -inset-10 rounded-[40px] ring-1 ring-accent"
      />
      <motion.div style={{ opacity, scale }} className="flex flex-col items-center gap-4">
        <span className="grid size-24 place-items-center rounded-[28px] bg-primary text-accent shadow-[0_30px_60px_-24px_rgba(15,16,19,0.6)] sm:size-28">
          <Spark className="size-9 sm:size-10" />
        </span>
        <span className="text-xl font-semibold tracking-[0.12em]">BUILD</span>
      </motion.div>
    </div>
  );
}

function Resolution({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0.72, 0.85], [0, 1]);
  const y = useTransform(progress, [0.72, 0.85], [16, 0]);
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
    <section id="problem" ref={ref} aria-labelledby="problem-heading" className="relative h-[260vh]">
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <Container className="grid items-center gap-8 pt-16 lg:grid-cols-2 lg:gap-16 lg:pt-0">
          <Intro>
            <Resolution progress={scrollYProgress} />
          </Intro>

          <div
            aria-hidden="true"
            className="relative mx-auto aspect-square w-full max-w-[min(100%,44svh)] [container-type:inline-size] lg:max-w-[min(100%,72svh)]"
          >
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
