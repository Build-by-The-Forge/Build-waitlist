"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/motion/reveal";

const stages = [
  { name: "Discover", line: "Find the topic you need, right where it lives in your course." },
  { name: "Understand", line: "Get explanations that start from what you covered in class." },
  { name: "Practice", line: "Test yourself on the exact material you're studying." },
  { name: "Improve", line: "See what's clicking, and what deserves another look." },
  { name: "Connect", line: "Link ideas across topics, and learn alongside others." },
  { name: "Master", line: "Walk into the exam knowing you've got this." },
];

function Stage({ stage, index, progress, still }: { stage: (typeof stages)[number]; index: number; progress: MotionValue<number>; still: boolean }) {
  const step = 1 / stages.length;
  const start = index * step;
  const opacity = useTransform(progress, [start - step * 0.6, start + step * 0.2], [0.18, 1]);
  const x = useTransform(progress, [start - step * 0.6, start + step * 0.2], [-12, 0]);

  return (
    <motion.li style={still ? undefined : { opacity, x }} className="relative grid gap-2 py-7 pl-10 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-baseline sm:gap-10 sm:pl-16">
      <span className="absolute top-[2.35rem] left-0 grid size-[15px] -translate-x-[7px] place-items-center rounded-full bg-background ring-1 ring-foreground/40 sm:top-[2.9rem]">
        <span className="size-[5px] rounded-full bg-accent" />
      </span>
      <h3 className="text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.95] font-semibold tracking-[-0.045em]">
        {stage.name}
      </h3>
      <p className="text-body text-foreground-muted">{stage.line}</p>
    </motion.li>
  );
}

export function LearningJourney() {
  const ref = useRef<HTMLOListElement>(null);
  const still = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="journey" aria-labelledby="journey-heading" className="py-24 sm:py-40">
      <Container>
        <Reveal className="max-w-4xl">
          <Badge>The journey</Badge>
          <h2 id="journey-heading" className="mt-5 text-heading text-balance">
            From <span className="font-serif font-normal italic">&ldquo;I don&rsquo;t understand this&rdquo;</span> to{" "}
            <span className="font-serif font-normal italic">&ldquo;I&rsquo;ve got this.&rdquo;</span>
          </h2>
        </Reveal>

        <ol ref={ref} className="relative mt-16 ml-2 sm:mt-24">
          <span aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-px bg-border" />
          <motion.span
            aria-hidden="true"
            style={still ? undefined : { scaleY: fill }}
            className="absolute top-0 bottom-0 left-0 w-px origin-top bg-accent"
          />
          {stages.map((s, i) => (
            <Stage key={s.name} stage={s} index={i} progress={scrollYProgress} still={still} />
          ))}
        </ol>
      </Container>
    </section>
  );
}
