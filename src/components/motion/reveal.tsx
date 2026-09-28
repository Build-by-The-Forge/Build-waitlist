import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * The site's motion vocabulary for entering content: fade-up, scale, stagger.
 *
 * These are plain server components. The animation is CSS scroll-driven
 * (`animation-timeline: view()`, see globals.css), so reveals cost no
 * JavaScript or hydration, respect prefers-reduced-motion, and degrade to
 * static content where unsupported.
 */
type RevealProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "fadeUp" | "scale" | "fade";
  /** Offsets this element's reveal slightly later, in stagger steps. */
  delay?: number;
};

const variantClass = { fadeUp: "reveal", scale: "reveal-scale", fade: "reveal-fade" } as const;

export function Reveal({ variant = "fadeUp", delay = 0, className, style, ...props }: RevealProps) {
  return (
    <div
      className={cn(variantClass[variant], className)}
      style={delay ? ({ "--i": delay * 10, ...style } as CSSProperties) : style}
      {...props}
    />
  );
}

/** Children reveal one after another as the row scrolls in. */
export function Stagger({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("reveal-stagger", className)} {...props} />;
}

/** A child of <Stagger>; kept as a named component for readability at call sites. */
export function StaggerItem(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
