"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useInView, useReducedMotion } from "framer-motion";
import { ArrowUp, BookOpen, Check, FileText, NotebookPen, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Spark } from "@/components/ui/logo";
import { Reveal } from "@/components/motion/reveal";
import { ProductWindow } from "@/components/visuals/product-window";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/*
 * Scripted marketing demo. Nothing here calls BUILD's AI service; the
 * responses are pre-written to show the Learn → Ask → Understand → Practice loop.
 */

type Phase = "idle" | "asking" | "thinking" | "answered" | "generating" | "practice" | "result";

const QUESTION = "Can you explain recursion using what we covered in class?";
const OPTIONS = ["4", "10", "24", "16"];
const CORRECT = "24";

const loop = [
  { label: "Learn", phases: ["idle"] },
  { label: "Ask", phases: ["asking", "thinking"] },
  { label: "Understand", phases: ["answered"] },
  { label: "Practice", phases: ["generating", "practice", "result"] },
] as const;

const topics = [
  { week: "Week 4", name: "Functions" },
  { week: "Week 5", name: "Loops" },
  { week: "Week 6", name: "Recursion", active: true },
  { week: "Week 7", name: "Sorting" },
];

const enter = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { type: "spring", stiffness: 140, damping: 20 } } as const;

function Thinking() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2" aria-label="BUILD is thinking">
      {[0, 1, 2].map((i) => (
        <m.span
          key={i}
          className="size-1.5 rounded-full bg-foreground-subtle"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function BuildBubble({ children }: { children: React.ReactNode }) {
  return (
    <m.div {...enter} className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-accent">
        <Spark className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </m.div>
  );
}

function Answer() {
  return (
    <div className="space-y-3 text-[0.9375rem] leading-relaxed">
      <p>
        In your Week 6 lecture, recursion was introduced with <strong>factorial</strong>. The idea: a function solves a
        problem by calling itself on a <em>smaller</em> version of it, until it reaches a case simple enough to answer
        directly: the <strong>base case</strong>.
      </p>
      <pre className="overflow-x-auto rounded-xl bg-ink p-4 font-mono text-[0.8125rem] leading-relaxed text-ink-foreground">
        <code>
          <span className="text-ink-muted">def</span> factorial(n):{"\n"}
          {"    "}
          <span className="text-ink-muted">if</span> n &lt;= 1:{"        "}
          <span className="text-accent"># base case</span>
          {"\n"}
          {"        "}
          <span className="text-ink-muted">return</span> 1{"\n"}
          {"    "}
          <span className="text-ink-muted">return</span> n * factorial(n - 1)
        </code>
      </pre>
      <p>
        It&rsquo;s the stack-of-plates example from class: each call waits on the one below it, then the answers
        multiply back up.
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs text-foreground-muted">
          <FileText className="size-3.5" /> Week 6 lecture slides
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs text-foreground-muted">
          <NotebookPen className="size-3.5" /> Your notes · Recursion
        </span>
      </div>
    </div>
  );
}

export function AiDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);

  // Start (and count a view) only once the demo has stayed on screen for a
  // moment, so scrolling past it on the way to the form doesn't trigger it.
  const started = useRef(false);
  useEffect(() => {
    if (!inView || started.current) return;
    const t = setTimeout(() => {
      started.current = true;
      track("product_demo_view", { demo: "ai_recursion" });
      setPhase("asking");
    }, 900);
    return () => clearTimeout(t);
  }, [inView]);

  useEffect(() => {
    if (phase === "asking") {
      const done = typed >= QUESTION.length;
      const t = setTimeout(
        () => (done ? setPhase("thinking") : setTyped(reduceMotion ? QUESTION.length : typed + 1)),
        done ? 250 : 28,
      );
      return () => clearTimeout(t);
    }
    if (phase === "thinking") {
      const t = setTimeout(() => setPhase("answered"), reduceMotion ? 200 : 1100);
      return () => clearTimeout(t);
    }
    if (phase === "generating") {
      const t = setTimeout(() => setPhase("practice"), reduceMotion ? 200 : 900);
      return () => clearTimeout(t);
    }
  }, [phase, typed, reduceMotion]);

  // Keep the newest message in view inside the chat pane.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
  }, [phase, reduceMotion]);

  function replay() {
    setChoice(null);
    setTyped(0);
    setPhase("asking");
  }

  const asked = phase !== "idle";
  const showAnswer = ["answered", "generating", "practice", "result"].includes(phase);
  const showPractice = ["practice", "result"].includes(phase);
  const activeStep = loop.findIndex((s) => (s.phases as readonly string[]).includes(phase));

  return (
    <section id="demo" aria-labelledby="demo-heading" className="bg-surface-muted/60 py-24 sm:py-32">
      <Container>
        <Reveal className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <Badge>See it in action</Badge>
            <h2 id="demo-heading" className="mt-5 text-heading text-balance">
              Ask about your course. Then practice it.
            </h2>
          </div>
          <ol className="flex flex-wrap items-center gap-2" aria-label="Learning loop">
            {loop.map((step, i) => (
              <li key={step.label} className="flex items-center gap-2">
                <span
                  aria-current={i === activeStep ? "step" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-500",
                    i === activeStep ? "bg-primary text-primary-foreground" : i < activeStep ? "bg-surface text-foreground" : "bg-surface text-foreground-subtle",
                  )}
                >
                  {step.label}
                </span>
                {i < loop.length - 1 && <span aria-hidden="true" className="text-foreground-subtle">→</span>}
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal variant="scale" className="mt-12" delay={0.1}>
          <div ref={ref}>
            <ProductWindow title="BUILD · CSC 101" bodyClassName="grid md:grid-cols-[240px_1fr]">
              {/* Course sidebar */}
              <aside className="hidden border-r border-border-subtle bg-surface-muted/40 p-5 md:block" aria-label="Course">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-accent-muted text-accent-strong">
                    <BookOpen className="size-4" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold">CSC 101</p>
                    <p className="text-xs text-foreground-subtle">Introduction to Computer Science</p>
                  </div>
                </div>
                <p className="mt-7 font-mono text-[0.6875rem] tracking-[0.14em] text-foreground-subtle uppercase">Topics</p>
                <ul className="mt-3 space-y-1">
                  {topics.map((t) => (
                    <li
                      key={t.name}
                      className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-sm", t.active ? "bg-surface font-medium ring-1 ring-border-subtle" : "text-foreground-muted")}
                    >
                      {t.name}
                      <span className="text-xs text-foreground-subtle">{t.week}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-7 font-mono text-[0.6875rem] tracking-[0.14em] text-foreground-subtle uppercase">Materials</p>
                <ul className="mt-3 space-y-2 text-sm text-foreground-muted">
                  <li className="flex items-center gap-2">
                    <FileText className="size-4" /> Lecture slides · Week 6
                  </li>
                  <li className="flex items-center gap-2">
                    <NotebookPen className="size-4" /> Your notes
                  </li>
                </ul>
              </aside>

              {/* Conversation */}
              <div className="flex h-[600px] flex-col sm:h-[640px]">
                <div className="flex items-center gap-2 border-b border-border-subtle px-5 py-3 text-sm md:hidden">
                  <BookOpen className="size-4 text-accent-strong" />
                  <span className="font-medium">CSC 101</span>
                  <span className="text-foreground-subtle">· Recursion</span>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-8">
                  {!asked && <p className="pt-10 text-center text-foreground-subtle">Ask anything about CSC 101…</p>}

                  {asked && (
                    <div className="flex justify-end">
                      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-[0.9375rem] text-primary-foreground">
                        {QUESTION.slice(0, typed)}
                        {phase === "asking" && <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-primary-foreground" />}
                      </p>
                    </div>
                  )}

                  {phase === "thinking" && (
                    <BuildBubble>
                      <Thinking />
                    </BuildBubble>
                  )}

                  {showAnswer && (
                    <BuildBubble>
                      <Answer />
                      <m.div {...enter} transition={{ ...enter.transition, delay: reduceMotion ? 0 : 0.5 }} className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-accent-muted/60 p-4">
                        <p className="font-medium">Want to practice this?</p>
                        {phase === "answered" && (
                          <span className="relative ml-auto">
                            <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-accent/40 [animation-duration:2s]" />
                            <Button size="sm" onClick={() => setPhase("generating")} className="relative">
                              <Spark className="text-accent" /> Generate practice
                            </Button>
                          </span>
                        )}
                        {phase === "generating" && <span className="ml-auto text-sm text-foreground-muted">Building a question from Week 6…</span>}
                      </m.div>
                    </BuildBubble>
                  )}

                  {showPractice && (
                    <BuildBubble>
                      <div className="rounded-2xl bg-surface p-5 ring-1 ring-border">
                        <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-foreground-subtle uppercase">Practice · Recursion</p>
                        <p className="mt-2 font-medium" id="demo-question">
                          Using the factorial function from your Week 6 notes, what does <code className="font-mono">factorial(4)</code> return?
                        </p>
                        <div role="radiogroup" aria-labelledby="demo-question" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {OPTIONS.map((opt) => {
                            const picked = choice === opt;
                            const reveal = phase === "result";
                            const correct = opt === CORRECT;
                            return (
                              <button
                                key={opt}
                                type="button"
                                role="radio"
                                aria-checked={picked}
                                disabled={reveal}
                                onClick={() => {
                                  setChoice(opt);
                                  setPhase("result");
                                }}
                                className={cn(
                                  "flex h-12 items-center justify-center gap-2 rounded-xl font-mono ring-1 transition-colors",
                                  !reveal && "ring-border hover:bg-surface-muted hover:ring-foreground/30",
                                  reveal && correct && "bg-success-muted text-success ring-success",
                                  reveal && picked && !correct && "bg-[#fdecea] text-danger ring-danger",
                                  reveal && !picked && !correct && "text-foreground-subtle ring-border-subtle",
                                )}
                              >
                                {reveal && correct && <Check className="size-4" aria-hidden="true" />}
                                {reveal && picked && !correct && <X className="size-4" aria-hidden="true" />}
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        <AnimatePresence>
                          {phase === "result" && (
                            <m.div {...enter} className="mt-4 border-t border-border-subtle pt-4 text-[0.9375rem]">
                              <p className={cn("font-semibold", choice === CORRECT ? "text-success" : "text-foreground")}>
                                {choice === CORRECT ? "Correct." : "Not quite."}
                              </p>
                              <p className="mt-1 text-foreground-muted">
                                Each call multiplies n by factorial(n − 1) until the base case at n = 1: 4 × 3 × 2 × 1 = 24.
                              </p>
                              <Button variant="secondary" size="sm" className="mt-4" onClick={replay}>
                                <RotateCcw /> Replay demo
                              </Button>
                            </m.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </BuildBubble>
                  )}
                </div>

                <div className="border-t border-border-subtle p-4">
                  <div className="flex items-center gap-3 rounded-full bg-surface-muted py-2 pr-2 pl-5 text-sm text-foreground-subtle">
                    <span className="flex-1 truncate">Ask about CSC 101…</span>
                    <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
                      <ArrowUp className="size-4" />
                    </span>
                  </div>
                </div>
              </div>
            </ProductWindow>
          </div>
        </Reveal>
        <p className="mt-4 text-center text-small text-foreground-subtle">Illustrative demo. Responses are pre-written to show how BUILD works.</p>
      </Container>
    </section>
  );
}
