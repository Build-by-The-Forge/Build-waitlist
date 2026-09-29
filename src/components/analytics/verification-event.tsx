"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Reports the verification outcome once. Carries the outcome only, never the address. */
export function VerificationEvent({ status }: { status: string }) {
  useEffect(() => {
    if (status === "verified") track("waitlist_verification_completed");
    else track("waitlist_verification_failed", { reason: status });
  }, [status]);
  return null;
}
