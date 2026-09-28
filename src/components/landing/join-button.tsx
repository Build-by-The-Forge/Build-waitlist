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
        document.getElementById(WAITLIST_INPUT_ID)?.focus({ preventScroll: true });
        onClick?.(e);
      }}
      {...props}
    />
  );
}
