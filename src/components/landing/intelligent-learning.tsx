import { BookMarked, Files, GitBranch, Lightbulb, ListChecks, ScanText, Waypoints } from "lucide-react";
import { Section } from "@/components/ui/container";
import { Spark } from "@/components/ui/logo";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

// Technical pipeline (OCR → extraction → context), told as what it does for the student.
const steps = [
  { icon: <Files />, name: "Your materials", detail: "Lecture slides, PDFs, notes and past questions, all in one place." },
  { icon: <ScanText />, name: "Read", detail: "BUILD reads the text in your slides, documents and scanned pages." },
  { icon: <Waypoints />, name: "Understand", detail: "It picks out the key concepts and how they relate to each other." },
  { icon: <BookMarked />, name: "Course context", detail: "Everything is mapped to your course, topic by topic." },
];

const outcomes = [
  { icon: <Lightbulb />, name: "Explain", detail: "Explanations grounded in what you actually covered in class." },
  { icon: <ListChecks />, name: "Practice", detail: "Questions built from the topics you're studying right now." },
  { icon: <GitBranch />, name: "Connect", detail: "See how today's topic links to what came before and what's next." },
];

/** A rail that draws itself as it scrolls into view (CSS scroll-driven). */
function DrawLine({ axis, className }: { axis: "x" | "y"; className: string }) {
  return <span aria-hidden="true" className={cn(axis === "x" ? "draw-x" : "draw-y", className)} />;
}

export function IntelligentLearning() {
  return (
    <Section
      id="how-it-works"
      label="The intelligence"
      heading="AI that understands what you're learning."
      intro="BUILD doesn't just respond to questions. It understands the context behind your learning: your course, your materials, and where you are in them."
    >
      <div className="mt-16">
        <div className="relative">
          {/* Rails */}
          <span aria-hidden="true" className="absolute top-2 bottom-2 left-[8px] w-px bg-border md:hidden" />
          <DrawLine axis="y" className="absolute top-2 bottom-2 left-[8px] w-px origin-top bg-accent md:hidden" />
          <span aria-hidden="true" className="absolute top-[8px] right-[calc(25%-1.625rem)] left-0 hidden h-px bg-border md:block" />
          <DrawLine axis="x" className="absolute top-[8px] right-[calc(25%-1.625rem)] left-0 hidden h-px origin-left bg-accent md:block" />

          <Stagger className="relative grid gap-8 md:grid-cols-4 md:gap-6">
            {steps.map((step, i) => (
              <StaggerItem key={step.name} className="relative pl-9 md:pt-10 md:pl-0">
                <span className="absolute top-0 left-0 grid size-[17px] place-items-center rounded-full bg-background ring-1 ring-foreground/30">
                  <span className="size-[7px] rounded-full bg-accent" />
                </span>
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-surface text-foreground ring-1 ring-border-subtle [&_svg]:size-4">{step.icon}</span>
                  <span className="font-mono text-xs tracking-[0.14em] text-foreground-subtle">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight">{step.name}</h3>
                <p className="mt-2 text-small text-foreground-muted">{step.detail}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        {/* Converge into BUILD AI */}
        <div className="flex flex-col items-center">
          <DrawLine axis="y" className="mt-10 h-14 w-px origin-top bg-border" />
          <Reveal variant="scale" delay={0.3}>
            <div className="relative">
              <span aria-hidden="true" className="absolute -inset-4 animate-pulse-soft rounded-full bg-accent/15" />
              <div className="relative flex items-center gap-3 rounded-full bg-primary py-3.5 pr-7 pl-4 text-primary-foreground">
                <span className="grid size-8 place-items-center rounded-full bg-ink-surface">
                  <Spark className="size-4 text-accent" />
                </span>
                <span>
                  <span className="block font-semibold">BUILD AI</span>
                  <span className="block text-xs text-ink-muted">Answers with your course in mind</span>
                </span>
              </div>
            </div>
          </Reveal>
          <DrawLine axis="y" className="h-14 w-px origin-top bg-border" />
          <span aria-hidden="true" className="hidden h-px w-2/3 bg-border md:block" />
        </div>

        <Stagger className="grid gap-4 md:mt-4 md:grid-cols-3">
          {outcomes.map((o) => (
            <StaggerItem key={o.name} className="relative rounded-3xl bg-surface p-6 ring-1 ring-border-subtle sm:p-8">
              <span aria-hidden="true" className="absolute -top-px left-1/2 hidden h-4 w-px -translate-y-full bg-border md:block" />
              <span className="grid size-10 place-items-center rounded-2xl bg-accent-muted text-accent-strong [&_svg]:size-5">{o.icon}</span>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight">{o.name}</h3>
              <p className="mt-2 text-foreground-muted">{o.detail}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
