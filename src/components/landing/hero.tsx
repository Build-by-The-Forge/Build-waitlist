import { ArrowDown, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { JoinButton } from "@/components/landing/join-button";
import { IntelligenceCanvas } from "@/components/visuals/intelligence-canvas";

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-heading" className="relative overflow-hidden pt-32 pb-6 sm:pt-40 sm:pb-10">
      {/* Faint dot field, fading out toward the edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,black,transparent)] opacity-60"
        style={{
          backgroundImage: "radial-gradient(var(--color-border) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <Container className="flex flex-col items-center text-center">
        <Badge className="animate-rise">The future of learning</Badge>

        <h1 id="hero-heading" className="mt-7 max-w-6xl text-display text-balance">
          Your learning journey,{" "}
          <span className="font-serif font-normal tracking-[-0.02em] italic">intelligently connected.</span>
        </h1>

        <p className="mt-8 max-w-2xl text-body text-foreground-muted text-pretty animate-rise [animation-delay:120ms]">
          BUILD brings your courses, learning materials, practice, progress, and community into one intelligent learning
          experience designed around you.
        </p>

        <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 animate-rise [animation-delay:200ms] sm:w-auto sm:flex-row">
          <JoinButton location="hero" size="lg" className="w-full sm:w-auto">
            Join the Waitlist <ArrowRight aria-hidden="true" />
          </JoinButton>
          <ButtonLink href="#experience" variant="secondary" size="lg" className="w-full sm:w-auto">
            See How BUILD Works <ArrowDown aria-hidden="true" />
          </ButtonLink>
        </div>
      </Container>

      <Container className="mt-16 sm:mt-20">
        <IntelligenceCanvas />
      </Container>
    </section>
  );
}
