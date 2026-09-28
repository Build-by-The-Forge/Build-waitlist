"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { isValidEmail } from "@/lib/waitlist/email";
import type { WaitlistStatus } from "@/lib/waitlist/types";

export const WAITLIST_INPUT_ID = "waitlist-email";

type State =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "duplicate" }
  | { kind: "error"; message: string };

const ERROR_MESSAGES: Record<Exclude<WaitlistStatus, "created" | "duplicate">, string> = {
  invalid: "Please enter a valid email address.",
  rate_limited: "Too many attempts. Please wait a minute and try again.",
  error: "Something went wrong. Please try again.",
};

export function WaitlistForm({ source = "final_cta", className }: { source?: string; className?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const mountedAt = useRef(0);
  const focused = useRef(false);
  const statusId = useId();

  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === "submitting") return;

    if (!isValidEmail(email)) {
      setState({ kind: "error", message: ERROR_MESSAGES.invalid });
      return;
    }

    const honeypot = new FormData(e.currentTarget).get("company");
    setState({ kind: "submitting" });
    track("waitlist_submit", { source });

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source,
          company: typeof honeypot === "string" ? honeypot : "",
          elapsedMs: Math.round(performance.now() - mountedAt.current),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { status?: WaitlistStatus };
      const status: WaitlistStatus = data.status ?? "error";

      if (status === "created") {
        setState({ kind: "success" });
        track("waitlist_success", { source });
      } else if (status === "duplicate") {
        setState({ kind: "duplicate" });
        track("waitlist_duplicate", { source });
      } else {
        setState({ kind: "error", message: ERROR_MESSAGES[status] });
        track("waitlist_error", { source, reason: status });
      }
    } catch {
      setState({ kind: "error", message: ERROR_MESSAGES.error });
      track("waitlist_error", { source, reason: "network" });
    }
  }

  const done = state.kind === "success" || state.kind === "duplicate";
  const submitting = state.kind === "submitting";
  const error = state.kind === "error" ? state.message : null;

  return (
    <div className={cn("w-full max-w-xl", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div
            key="done"
            role="status"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            className="flex items-start gap-4 rounded-3xl bg-surface p-6 text-left ring-1 ring-border-subtle"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success-muted text-success">
              <Check className="size-5" aria-hidden="true" />
            </span>
            <div>
              {state.kind === "success" ? (
                <>
                  <p className="text-lg font-semibold tracking-tight">
                    You&rsquo;re in. <span aria-hidden="true">🚀</span>
                  </p>
                  <p className="mt-1 text-foreground-muted">You&rsquo;re on the list. Welcome to BUILD.</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold tracking-tight">You&rsquo;re already on the BUILD waitlist.</p>
                  <p className="mt-1 text-foreground-muted">We&rsquo;ll be in touch when early access opens.</p>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            exit={{ opacity: 0, y: -8 }}
            onSubmit={onSubmit}
            noValidate
            aria-describedby={statusId}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor={WAITLIST_INPUT_ID} className="sr-only">
              Email address
            </label>
            <Input
              id={WAITLIST_INPUT_ID}
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Your email"
              required
              maxLength={254}
              value={email}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? statusId : undefined}
              disabled={submitting}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setState({ kind: "idle" });
              }}
              onFocus={() => {
                if (focused.current) return;
                focused.current = true;
                track("waitlist_form_focus", { source });
              }}
            />
            {/* Honeypot: invisible to people and assistive tech, tempting to bots. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label>
                Company
                <input type="text" name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
              </label>
            </div>
            <Button type="submit" size="lg" disabled={submitting} className="shrink-0">
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Joining…
                </>
              ) : (
                <>
                  Join the Waitlist
                  <ArrowRight aria-hidden="true" />
                </>
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
      <p id={statusId} aria-live="polite" className={cn("mt-3 min-h-6 text-small", error ? "text-danger" : "text-foreground-subtle")}>
        {error ?? (done ? "" : "Email only. Unsubscribe anytime.")}
      </p>
    </div>
  );
}
