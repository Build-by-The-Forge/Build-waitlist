"use client";

import { motion, type HTMLMotionProps, type Variants } from "framer-motion";

/**
 * The site's whole motion vocabulary: fade-up, scale, stagger.
 * Reduced motion is handled globally by <MotionConfig reducedMotion="user">,
 * which drops transform animations and keeps opacity.
 */
export const spring = { type: "spring", stiffness: 90, damping: 20, mass: 0.9 } as const;
export const viewport = { once: true, margin: "0px 0px -12% 0px" } as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: spring },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: spring },
};

type RevealProps = HTMLMotionProps<"div"> & { variant?: "fadeUp" | "scale"; delay?: number };

export function Reveal({ variant = "fadeUp", delay = 0, children, ...props }: RevealProps) {
  const variants: Variants =
    variant === "scale"
      ? { hidden: scaleIn.hidden, show: { opacity: 1, scale: 1, transition: { ...spring, delay } } }
      : { hidden: fadeUp.hidden, show: { opacity: 1, y: 0, transition: { ...spring, delay } } };
  return (
    <motion.div initial="hidden" whileInView="show" viewport={viewport} variants={variants} {...props}>
      {children}
    </motion.div>
  );
}

export function Stagger({ gap = 0.08, children, ...props }: HTMLMotionProps<"div"> & { gap?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ variant = "fadeUp", children, ...props }: HTMLMotionProps<"div"> & { variant?: "fadeUp" | "scale" }) {
  return (
    <motion.div variants={variant === "scale" ? scaleIn : fadeUp} {...props}>
      {children}
    </motion.div>
  );
}
