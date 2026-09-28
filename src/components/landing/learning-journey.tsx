import type { CSSProperties } from "react";
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

/**
 * Scroll-driven in CSS (see .dim-in / .rail-fill in globals.css): each stage
 * heading comes up to full strength as it reaches reading height, and the rail
 * fills as the list passes through the viewport.
 */
export function LearningJourney() {
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

        <ol className="relative mt-16 ml-2 sm:mt-24" style={{ viewTimelineName: "--journey" } as CSSProperties}>
          <span aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-px bg-border" />
          <span aria-hidden="true" className="rail-fill absolute top-0 bottom-0 left-0 w-px origin-top bg-accent" />
          {stages.map((stage) => (
            <li
              key={stage.name}
              className="relative grid gap-2 py-7 pl-10 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-baseline sm:gap-10 sm:pl-16"
            >
              <span className="absolute top-[2.35rem] left-0 grid size-[15px] -translate-x-[7px] place-items-center rounded-full bg-background ring-1 ring-foreground/40 sm:top-[2.9rem]">
                <span className="size-[5px] rounded-full bg-accent" />
              </span>
              <h3 className="dim-in text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.95] font-semibold tracking-[-0.045em]">
                {stage.name}
              </h3>
              <p className="text-body text-foreground-muted">{stage.line}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
