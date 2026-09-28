import { Container } from "@/components/ui/container";
import { Spark } from "@/components/ui/logo";
import { Reveal } from "@/components/motion/reveal";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { WAITLIST_ANCHOR } from "@/lib/site";

export function WaitlistCTA() {
  return (
    <section id={WAITLIST_ANCHOR} aria-labelledby="join-heading" className="relative isolate overflow-clip py-28 sm:py-40">
      <Spark className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[min(90vw,720px)] -translate-x-1/2 -translate-y-1/2 text-surface-muted" />
      <Container className="flex flex-col items-center text-center">
        <Reveal className="flex flex-col items-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-small text-foreground-muted ring-1 ring-border-subtle">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative size-2 rounded-full bg-accent" />
            </span>
            Early access
          </p>
          <h2 id="join-heading" className="mt-7 max-w-4xl text-display text-balance">
            Be among the first to <span className="font-serif font-normal tracking-[-0.02em] italic">BUILD.</span>
          </h2>
          <p className="mt-7 max-w-xl text-body text-foreground-muted text-pretty">
            Join the early community and get first access when BUILD launches.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-10 flex w-full justify-center">
          <WaitlistForm source="final_cta" />
        </Reveal>
      </Container>
    </section>
  );
}
