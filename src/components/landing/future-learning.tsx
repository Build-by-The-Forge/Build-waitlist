"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Spark } from "@/components/ui/logo";
import { Reveal } from "@/components/motion/reveal";

const pillars = [
  { name: "Knowledge", x: 18 },
  { name: "Practice", x: 50 },
  { name: "Community", x: 82 },
];

function VisionDiagram() {
  return (
    <div aria-hidden="true" className="relative mx-auto aspect-[5/4] w-full max-w-3xl sm:aspect-[16/9]">
      {/* Top-down clip wipe; pathLength breaks under non-scaling strokes. */}
      <motion.svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        initial={{ clipPath: "inset(0 0 100% 0)" }}
        whileInView={{ clipPath: "inset(0 0 0% 0)" }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 1.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {pillars.map((p) => (
          <g key={p.name}>
            <path d={`M50 14 C50 32 ${p.x} 32 ${p.x} 50`} fill="none" stroke="#3a3e4a" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
            <path
              d={`M${p.x} 50 C${p.x} 68 50 68 50 86`}
              fill="none"
              stroke="var(--color-accent)"
              strokeOpacity={0.75}
              strokeWidth={1.25}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </motion.svg>

      <div className="absolute top-[14%] left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <span className="absolute -inset-6 animate-pulse-soft rounded-full bg-accent/20 blur-xl" />
          <span className="relative grid size-14 place-items-center rounded-2xl bg-ink-foreground text-accent sm:size-16">
            <Spark className="size-6 sm:size-7" />
          </span>
        </div>
      </div>

      {pillars.map((p, i) => (
        <motion.span
          key={p.name}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-surface px-3 py-2 font-mono text-[0.6875rem] tracking-[0.14em] text-ink-foreground uppercase ring-1 ring-ink-border sm:px-4 sm:text-xs"
          style={{ left: `${p.x}%` }}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ delay: 0.7 + i * 0.12 }}
        >
          {p.name}
        </motion.span>
      ))}

      <motion.span
        className="absolute top-[86%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink sm:px-5 sm:py-2.5"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ delay: 1.5, type: "spring", stiffness: 140, damping: 16 }}
      >
        Your future
      </motion.span>
    </div>
  );
}

export function FutureLearning() {
  return (
    <section id="about" aria-labelledby="about-heading" className="relative isolate overflow-hidden bg-ink py-28 text-ink-foreground sm:py-40">
      {/* Fine grid + one soft ember glow: depth without decoration overload */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-ink-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-ink-border) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div aria-hidden="true" className="absolute top-1/3 left-1/2 -z-10 size-[640px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />

      <Container className="text-center">
        <Reveal className="mx-auto max-w-4xl">
          <p className="inline-flex items-center gap-2 font-mono text-[0.75rem] font-medium tracking-[0.14em] text-ink-muted uppercase">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
            Our vision
          </p>
          <h2 id="about-heading" className="mt-6 text-heading text-balance">
            We&rsquo;re building the <span className="font-serif font-normal italic">future of learning.</span>
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-body text-ink-muted text-pretty">
            A world where every student has an intelligent learning environment that understands where they&rsquo;ve
            been, where they are, and where they&rsquo;re going.
          </p>
        </Reveal>

        <div className="mt-16 sm:mt-24">
          <VisionDiagram />
        </div>
      </Container>
    </section>
  );
}
