"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const PRACTICE_STAGES = ["Question", "Answer", "Evaluation", "Explanation", "Next question"] as const;

const options = ["The recursive call", "The base case", "The return type", "The loop counter"];
const CORRECT = 1;

/**
 * Practice-test mock that steps through question → answer → evaluation →
 * explanation → next while visible. Static on reduced motion.
 */
export function PracticeSession({ onStage }: { onStage?: (stage: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState(0);
  const shown = reduceMotion ? 3 : stage;

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const id = setInterval(() => setStage((s) => (s + 1) % PRACTICE_STAGES.length), 1700);
    return () => clearInterval(id);
  }, [inView, reduceMotion]);

  useEffect(() => onStage?.(shown), [shown, onStage]);

  const nextVisible = shown === 4;

  return (
    <div ref={ref} className="p-5 sm:p-8" aria-hidden="true">
      <div className="flex items-center justify-between text-xs text-foreground-subtle">
        <span className="font-mono tracking-[0.14em] uppercase">Practice test · CSC 101</span>
        <span>Question {nextVisible ? 4 : 3} of 10</span>
      </div>
      <div className="mt-3 flex gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-colors duration-500", i < (nextVisible ? 3 : 2) ? "bg-foreground" : i === (nextVisible ? 3 : 2) ? "bg-accent" : "bg-surface-muted")}
          />
        ))}
      </div>

      <div className="relative mt-8 min-h-[380px]">
        <AnimatePresence mode="wait" initial={false}>
          {nextVisible ? (
            <m.div key="next" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <p className="text-xs font-medium text-foreground-subtle">Loops</p>
              <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">How many times does a for-loop over range(5) run?</p>
              <div className="mt-6 grid gap-2">
                {["4", "5", "6", "It depends"].map((o) => (
                  <div key={o} className="rounded-xl px-4 py-3 text-sm ring-1 ring-border">
                    {o}
                  </div>
                ))}
              </div>
            </m.div>
          ) : (
            <m.div key="q" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <p className="text-xs font-medium text-foreground-subtle">Recursion</p>
              <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">Which part of a recursive function stops it from running forever?</p>
              <div className="mt-6 grid gap-2">
                {options.map((o, i) => {
                  const selected = shown >= 1 && i === CORRECT;
                  const evaluated = shown >= 2 && i === CORRECT;
                  return (
                    <div
                      key={o}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-4 py-3 text-sm ring-1 transition-all duration-500",
                        evaluated ? "bg-success-muted ring-success" : selected ? "bg-surface-muted ring-foreground" : "ring-border",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-xs text-foreground-subtle">{String.fromCharCode(65 + i)}</span>
                        {o}
                      </span>
                      {evaluated && (
                        <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-xs font-semibold text-success">
                          <Check className="size-3.5" /> Correct
                        </m.span>
                      )}
                    </div>
                  );
                })}
              </div>
              <AnimatePresence>
                {shown >= 3 && (
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 rounded-xl bg-surface-muted p-4 text-sm"
                  >
                    <p className="font-semibold">Why</p>
                    <p className="mt-1 text-foreground-muted">
                      The base case returns without calling the function again, so the chain of calls ends. It&rsquo;s
                      the <span className="font-mono">n &lt;= 1</span> check from your Week 6 notes.
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium">
                      Next question <ArrowRight className="size-3" />
                    </p>
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
