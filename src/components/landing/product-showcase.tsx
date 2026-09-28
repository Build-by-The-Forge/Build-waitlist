import { ChevronRight, FileText, NotebookPen, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Spark } from "@/components/ui/logo";
import { Reveal } from "@/components/motion/reveal";
import { KnowledgeTree } from "@/components/visuals/knowledge-tree";
import { ProductWindow } from "@/components/visuals/product-window";
import { Flow, Showcase } from "@/components/landing/showcase-parts";
import { PracticeBlock } from "@/components/landing/practice-block";

function ContextVisual() {
  return (
    <ProductWindow title="BUILD · Learn" bodyClassName="grid lg:grid-cols-[1.35fr_1fr]">
      <div className="p-5 sm:p-8" aria-hidden="true">
        <p className="flex items-center gap-1.5 text-xs text-foreground-subtle">
          CSC 101 <ChevronRight className="size-3" /> Week 6 <ChevronRight className="size-3" />
          <span className="font-medium text-foreground">Recursion</span>
        </p>
        <p className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">Recursion</p>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-foreground-muted">
          A recursive function solves a problem by calling itself on a smaller input. Every recursive function needs a{" "}
          <mark className="rounded bg-accent-muted px-1 text-foreground">base case</mark> that stops the calls, and a step
          that moves toward it.
        </p>
        <div className="mt-6 rounded-2xl bg-primary p-5 text-primary-foreground">
          <p className="flex items-center gap-2 text-xs text-ink-muted">
            <Spark className="size-3.5 text-accent" /> Explained for you
          </p>
          <p className="mt-2 text-[0.9375rem] leading-relaxed">
            You already know loops from Week 5. Recursion is another way to repeat work, except each repeat is a new
            call that waits for the one after it.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-foreground-subtle">Connects to</span>
          <span className="rounded-full bg-surface-muted px-2.5 py-1">Functions · Week 4</span>
          <span className="rounded-full bg-surface-muted px-2.5 py-1">Sorting · Week 7</span>
        </div>
      </div>
      <aside className="border-t border-border-subtle bg-surface-muted/40 p-5 sm:p-8 lg:border-t-0 lg:border-l" aria-hidden="true">
        <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-foreground-subtle uppercase">Sources</p>
        <div className="mt-4 rounded-2xl bg-surface p-4 ring-1 ring-border-subtle">
          <p className="flex items-center gap-2 text-xs font-medium">
            <FileText className="size-3.5 text-accent-strong" /> Lecture slides · Week 6 · p.12
          </p>
          <p className="mt-3 flex gap-2 text-sm text-foreground-muted">
            <Quote className="size-3.5 shrink-0 text-foreground-subtle" />
            <span>
              &ldquo;A recursive definition has two parts: a <span className="bg-accent-muted text-foreground">base case</span> and a recursive case.&rdquo;
            </span>
          </p>
        </div>
        <div className="mt-3 rounded-2xl bg-surface p-4 ring-1 ring-border-subtle">
          <p className="flex items-center gap-2 text-xs font-medium">
            <NotebookPen className="size-3.5 text-accent-strong" /> Your notes · Oct 14
          </p>
          <p className="mt-3 text-sm text-foreground-muted">factorial → n × factorial(n−1), stop at 1. Plates example!</p>
        </div>
      </aside>
    </ProductWindow>
  );
}

export function ProductShowcase() {
  return (
    <section id="product" aria-labelledby="product-heading" className="py-24 sm:py-32">
      <Container>
        <Reveal className="max-w-3xl">
          <Badge>The product</Badge>
          <h2 id="product-heading" className="mt-5 text-heading text-balance">
            Built around how you actually learn.
          </h2>
        </Reveal>

        <div className="mt-20 space-y-28 sm:space-y-40">
          <Showcase
            index="01"
            title="Learn with context."
            body="Every explanation starts from your course: the topic you're on, the lecture it came from, and the notes you took. You can always see where an answer comes from."
            flow={<Flow steps={["Course", "Topic", "Explanation", "Source"]} />}
          >
            <ContextVisual />
          </Showcase>

          <PracticeBlock />

          <Showcase
            index="03"
            title="See the bigger picture."
            body="Topics don't live in isolation. BUILD maps how concepts build on each other, so you can see what you've mastered, what you're working on, and what it unlocks next."
            flow={<Flow steps={["Understood", "In progress", "Up next"]} />}
          >
            <ProductWindow title="BUILD · Knowledge map" bodyClassName="p-5 sm:p-10">
              <KnowledgeTree />
            </ProductWindow>
          </Showcase>
        </div>
      </Container>
    </section>
  );
}
