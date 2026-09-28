"use client";

import type { ComponentProps } from "react";
import { ButtonLink } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { WAITLIST_ANCHOR } from "@/lib/site";
import { WAITLIST_INPUT_ID } from "@/components/landing/waitlist-form";

/** Every "Join the Waitlist" CTA: scrolls to the form and puts the cursor in the email field. */
export function JoinButton({
  location,
  onClick,
  ...props
}: ComponentProps<typeof ButtonLink> & { location: string }) {
  return (
    <ButtonLink
      href={`#${WAITLIST_ANCHOR}`}
      onClick={(e) => {
        track("hero_cta_click", { location });
        onClick?.(e);
        const section = document.getElementById(WAITLIST_ANCHOR);
        const input = document.getElementById(WAITLIST_INPUT_ID);
        if (!section || !input) return; // fall back to the plain anchor jump
        // Following the hash would reset focus, so scroll and focus ourselves.
        e.preventDefault();
        history.pushState(null, "", `#${WAITLIST_ANCHOR}`);
        const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // Next frame: lets a closing mobile menu release its scroll lock first.
        requestAnimationFrame(() => {
          section.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
          input.focus({ preventScroll: true });
        });
      }}
      {...props}
    />
  );
}
