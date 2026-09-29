/* eslint-disable @next/next/no-img-element -- a static SVG gains nothing from next/image optimization */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Path of the vector logo mark (the gradient "B" with cap and rising bars). */
export const BUILD_MARK_SRC = "/brand/build-mark.svg";
const MARK_RATIO = 92 / 108; // width / height of the mark's viewBox

/**
 * The BUILD spark: a four-point star. Since the real logo arrived, it means
 * one thing only: BUILD's intelligence (the "BUILD AI" moments). The brand
 * itself is always the logo mark below.
 */
export function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4", className)}>
      <path
        fill="currentColor"
        d="M12 1.5c.5 4.9 2.2 7.8 4.6 9.1 1.4.7 3.2 1.1 5.9 1.4-2.7.3-4.5.7-5.9 1.4-2.4 1.3-4.1 4.2-4.6 9.1-.5-4.9-2.2-7.8-4.6-9.1C6 12.7 4.2 12.3 1.5 12c2.7-.3 4.5-.7 5.9-1.4C9.8 9.3 11.5 6.4 12 1.5Z"
      />
    </svg>
  );
}

/**
 * The logo mark in full colour. Rendered as an <img> of the static SVG so any
 * number of instances can share one cached file without SVG id collisions.
 * Size it by height; width follows the mark's proportions.
 */
export function BuildMark({ height = 28, className, alt = "" }: { height?: number; className?: string; alt?: string }) {
  return (
    <img
      src={BUILD_MARK_SRC}
      alt={alt}
      width={Math.round(height * MARK_RATIO)}
      height={height}
      decoding="async"
      draggable={false}
      className={cn("shrink-0 select-none", className)}
    />
  );
}

/**
 * Single-colour silhouette of the mark (cap and bars stay cut out), painted
 * with the current text colour via CSS mask. For watermarks and tinted uses.
 */
export function BuildMarkSilhouette({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block bg-current", className)}
      style={{
        aspectRatio: `${MARK_RATIO}`,
        mask: `url(${BUILD_MARK_SRC}) center / contain no-repeat`,
        WebkitMask: `url(${BUILD_MARK_SRC}) center / contain no-repeat`,
        ...style,
      }}
    />
  );
}

/** Mark + wordmark, as in the brand logo's horizontal lockup. */
export function Logo({ className, inverse = false, size = 28 }: { className?: string; inverse?: boolean; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BuildMark height={size} />
      <span className={cn("text-[1.0625rem] font-bold tracking-[0.1em]", inverse ? "text-ink-foreground" : "text-brand-ink")}>BUILD</span>
    </span>
  );
}
