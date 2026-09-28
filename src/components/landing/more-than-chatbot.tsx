import { Section } from "@/components/ui/container";
import { Reveal } from "@/components/motion/reveal";

const capabilities = [
  { name: "Understand", line: "Understand your course context." },
  { name: "Practice", line: "Practice what you're actually learning." },
  { name: "Connect", line: "See how concepts relate." },
  { name: "Prepare", line: "Turn knowledge into active practice." },
  { name: "Track", line: "Understand your progress." },
  { name: "Grow", line: "Build better learning habits." },
];

export function MoreThanAChatbot() {
  return (
    <Section
      id="capabilities"
      label="Beyond answers"
      heading={
        <>
          BUILD isn&rsquo;t just another <span className="font-serif font-normal italic">AI chatbot.</span>
        </>
      }
      intro="A chatbot answers a question and forgets it. BUILD works inside your learning, so every answer leads somewhere."
    >
      <div className="mt-16 grid gap-px overflow-clip rounded-3xl bg-border-subtle ring-1 ring-border-subtle sm:grid-cols-2 lg:grid-cols-3">
        {capabilities.map((c, i) => (
          <div key={c.name} className="group bg-background p-8 sm:p-10">
            {/* Reveal the content, not the cell, so the grid lines never flash through. */}
            <Reveal delay={(i % 3) * 0.1}>
              <p className="font-mono text-xs tracking-[0.14em] text-foreground-subtle">0{i + 1}</p>
              <h3 className="mt-4 text-[clamp(2rem,3.4vw,3rem)] leading-none font-semibold tracking-[-0.035em] transition-colors duration-300 group-hover:text-accent-strong">
                {c.name}
              </h3>
              <p className="mt-4 text-body text-foreground-muted">{c.line}</p>
            </Reveal>
          </div>
        ))}
      </div>
    </Section>
  );
}
