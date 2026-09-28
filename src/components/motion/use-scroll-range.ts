"use client";

import { useTransform, type MotionValue } from "framer-motion";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Maps scroll progress in [from, to] to [a, b], holding a before and b after.
 *
 * Keyframes always span the full 0 → 1 timeline. Framer Motion hands simple
 * scroll-linked transforms to the browser's native ScrollTimeline, and a
 * partial range there does not clamp: past the last keyframe the value wraps
 * (e.g. an element faded in at 60% faded back out by 95%).
 */
export function useScrollRange(progress: MotionValue<number>, [from, to]: readonly [number, number], [a, b]: readonly [number, number]) {
  const start = clamp01(from);
  const end = Math.max(start, clamp01(to));
  return useTransform(progress, [0, start, end, 1], [a, a, b, b]);
}
