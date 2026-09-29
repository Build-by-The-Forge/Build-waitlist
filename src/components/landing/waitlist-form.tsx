"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ArrowRight, Check, Loader2, Mail, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ctaSource } from "@/lib/waitlist/attribution";
import { isValidEmail } from "@/lib/waitlist/email";
import type { WaitlistStatus } from "@/lib/waitlist/types";

export const WAITLIST_INPUT_ID = "waitlist-email";

/** Matches the server's per-address cooldown between verification emails. */
const RESEND_COOLDOWN_S = 60;

type State =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent"; email: string }
  | { kind: "duplicate" }
  | { kind: "error"; message: string };

const ERROR_MESSAGES: Partial<Record<WaitlistStatus, string>> = {
  invalid: "Please enter a valid email address.",
  invalid_domain: "That email domain can't receive mail. Please check for typos.",
  rate_limited: "Too many attempts. Please wait a minute and try again.",
  email_failed: "We couldn't send the verification email just now. Please try again.",
  error: "Something went wrong. Please try again.",
};

/** `fallbackSource` is recorded when the visitor reached the form without a Join button. */
export function WaitlistForm({ fallbackSource = "final_cta", className }: { fallbackSource?: string; className?: string }) {
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
    const source = ctaSource(fallbackSource);

    if (!isValidEmail(email)) {
      setState({ kind: "error", message: ERROR_MESSAGES.invalid! });
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

      if (status === "verification_sent") {
        setState({ kind: "sent", email: email.trim() });
        track("waitlist_verification_requested", { source });
      } else if (status === "duplicate") {
        setState({ kind: "duplicate" });
        track("waitlist_duplicate", { source });
      } else {
        setState({ kind: "error", message: ERROR_MESSAGES[status] ?? ERROR_MESSAGES.error! });
        track("waitlist_error", { source, reason: status });
      }
    } catch {
      setState({ kind: "error", message: ERROR_MESSAGES.error! });
      track("waitlist_error", { source, reason: "network" });
    }
  }

  const submitting = state.kind === "submitting";
  const error = state.kind === "error" ? state.message : null;
  const showForm = state.kind !== "sent" && state.kind !== "duplicate";

  return (
    <div className={cn("w-full max-w-xl", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {state.kind === "sent" ? (
          <CheckInbox key="sent" email={state.email} onChangeEmail={() => setState({ kind: "idle" })} />
        ) : state.kind === "duplicate" ? (
          <m.div
            key="duplicate"
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
              <p className="text-lg font-semibold tracking-tight">You&rsquo;re already on the BUILD waitlist.</p>
              <p className="mt-1 text-foreground-muted">We&rsquo;ll be in touch when early access opens.</p>
            </div>
          </m.div>
        ) : (
          <m.form
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
                track("waitlist_form_focus", { source: ctaSource(fallbackSource) });
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
          </m.form>
        )}
      </AnimatePresence>
      <p id={statusId} aria-live="polite" className={cn("mt-3 min-h-6 text-small", error ? "text-danger" : "text-foreground-subtle")}>
        {error ?? (showForm ? "Email only. We'll send a link to confirm it's you." : "")}
      </p>
    </div>
  );
}

/** "Check your inbox" state with a resend button that respects the server cooldown. */
function CheckInbox({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [resend, setResend] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onResend() {
    setResend("sending");
    track("waitlist_verification_resend");
    try {
      const res = await fetch("/api/waitlist/verify/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResend(res.ok ? "sent" : "error");
    } catch {
      setResend("error");
    }
    setCooldown(RESEND_COOLDOWN_S);
  }

  return (
    <m.div
      role="status"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      className="rounded-3xl bg-surface p-6 text-left ring-1 ring-border-subtle"
    >
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-muted text-accent-strong">
          <Mail className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight">Check your inbox.</p>
          <p className="mt-1 text-foreground-muted">
            We&rsquo;ve sent a verification link to <span className="font-medium break-all text-foreground">{email}</span>. Click it to
            confirm your spot on the BUILD waitlist.
          </p>
          <p className="mt-2 text-small text-foreground-subtle">Can&rsquo;t find it? Check your spam or promotions folder.</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle pt-4 text-small">
        <Button variant="secondary" size="sm" onClick={onResend} disabled={cooldown > 0 || resend === "sending"}>
          {resend === "sending" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
        </Button>
        <button type="button" onClick={onChangeEmail} className="text-foreground-muted underline-offset-4 hover:text-foreground hover:underline">
          Use a different email
        </button>
        <span aria-live="polite" className="w-full text-foreground-subtle sm:w-auto">
          {resend === "sent" && "If that address is awaiting verification, a new link is on its way."}
          {resend === "error" && "Couldn't resend just now. Please try again shortly."}
        </span>
      </div>
    </m.div>
  );
}
