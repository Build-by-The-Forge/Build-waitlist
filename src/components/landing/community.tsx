import { FileText, MessageSquare, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Spark } from "@/components/ui/logo";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ProductWindow } from "@/components/visuals/product-window";

const pillars = [
  { icon: <MessageSquare />, title: "Ask questions", line: "Get unstuck with people taking the same course." },
  { icon: <FileText />, title: "Share knowledge", line: "Notes and explanations, attached to the topics they belong to." },
  { icon: <Users />, title: "Find your people", line: "Study circles around the courses you're taking." },
];

function Avatar({ letter, tone }: { letter: string; tone: "ember" | "ink" | "muted" }) {
  const tones = {
    ember: "bg-accent-muted text-accent-strong",
    ink: "bg-primary text-primary-foreground",
    muted: "bg-surface-muted text-foreground",
  };
  return <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${tones[tone]}`}>{letter}</span>;
}

function Feed() {
  return (
    <ProductWindow title="BUILD · Social" bodyClassName="p-4 sm:p-6">
      <div aria-hidden="true" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-semibold">CSC 101 · Study circle</p>
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-foreground-muted">Recursion</span>
        </div>

        <article className="rounded-2xl bg-surface p-4 ring-1 ring-border-subtle">
          <div className="flex items-start gap-3">
            <Avatar letter="A" tone="ember" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-semibold">Amara</span> <span className="text-foreground-subtle">asked · Week 6</span>
              </p>
              <p className="mt-1.5 text-[0.9375rem]">Why does my factorial function never stop? I think I&rsquo;m missing something obvious.</p>
              <div className="mt-3 rounded-xl bg-surface-muted p-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <Avatar letter="K" tone="muted" />
                  <p className="pt-1.5 text-foreground-muted">
                    Check your base case. If n never hits it, it keeps calling itself. Slide 12 has the pattern.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-foreground-muted">
                <Spark className="size-3 text-accent" />
                Related in your course: <span className="font-medium text-foreground">Recursion · base cases</span>
              </div>
            </div>
          </div>
        </article>

        <article className="flex items-start gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border-subtle">
          <Avatar letter="D" tone="ink" />
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-semibold">David</span> <span className="text-foreground-subtle">shared notes</span>
            </p>
            <div className="mt-2 flex items-center gap-3 rounded-xl bg-surface-muted p-3">
              <FileText className="size-4 text-accent-strong" />
              <div className="text-sm leading-tight">
                <p className="font-medium">Recursion cheat sheet</p>
                <p className="text-xs text-foreground-subtle">Linked to Week 6 · Recursion</p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </ProductWindow>
  );
}

export function Community() {
  return (
    <section id="community" aria-labelledby="community-heading" className="overflow-hidden py-24 sm:py-32">
      <Container className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <Reveal>
            <Badge>Community</Badge>
            <h2 id="community-heading" className="mt-5 text-heading text-balance">
              Learning is better <span className="font-serif font-normal italic">together.</span>
            </h2>
            <p className="mt-6 max-w-xl text-body text-foreground-muted text-pretty">
              Ask questions. Share knowledge. Find people learning the same things. Build together.
            </p>
          </Reveal>

          <Stagger className="mt-10 space-y-6">
            {pillars.map((p) => (
              <StaggerItem key={p.title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface ring-1 ring-border-subtle [&_svg]:size-4.5">{p.icon}</span>
                <div>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="text-foreground-muted">{p.line}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.2}>
            <p className="mt-10 max-w-xl border-l-2 border-accent pl-4 text-foreground">
              BUILD Social isn&rsquo;t another feed to scroll. It&rsquo;s a learning layer: every conversation is tied to
              the course and topic it&rsquo;s about.
            </p>
          </Reveal>
        </div>

        <Reveal variant="scale" delay={0.1} className="relative">
          <div aria-hidden="true" className="absolute -inset-10 -z-10 rounded-[48px] bg-surface-muted/70" />
          <Feed />
        </Reveal>
      </Container>
    </section>
  );
}
