import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Clock, X } from "lucide-react";
import { VerificationEvent } from "@/components/analytics/verification-event";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { WAITLIST_ANCHOR } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Email verification — BUILD",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

type View = {
  tone: "success" | "warning" | "error";
  title: string;
  body: string;
  action: { label: string; href: string };
};

const views: Record<string, View> = {
  verified: {
    tone: "success",
    title: "Your email is verified.",
    body: "You're officially on the BUILD waitlist. We'll be in touch when early access opens.",
    action: { label: "Back to BUILD", href: "/" },
  },
  expired: {
    tone: "warning",
    title: "This verification link has expired.",
    body: "Links are valid for a limited time. Enter your email again and we'll send you a fresh one.",
    action: { label: "Request a new verification email", href: `/#${WAITLIST_ANCHOR}` },
  },
  invalid: {
    tone: "error",
    title: "This link is invalid or has already been used.",
    body: "If you've already verified, you're all set. Otherwise, enter your email again to get a new link.",
    action: { label: "Go to the waitlist", href: `/#${WAITLIST_ANCHOR}` },
  },
  rate_limited: {
    tone: "warning",
    title: "Too many attempts.",
    body: "Please wait a minute, then open the link from your email again.",
    action: { label: "Back to BUILD", href: "/" },
  },
  error: {
    tone: "error",
    title: "Something went wrong.",
    body: "We couldn't verify your email just now. Please try the link again in a moment.",
    action: { label: "Back to BUILD", href: "/" },
  },
};

const toneStyles = {
  success: { ring: "bg-success-muted text-success", Icon: Check },
  warning: { ring: "bg-accent-muted text-accent-strong", Icon: Clock },
  error: { ring: "bg-surface-muted text-foreground", Icon: X },
} as const;

export default async function VerifiedPage({ searchParams }: Props) {
  const raw = (await searchParams).status;
  const key = typeof raw === "string" && raw in views ? raw : "invalid";
  const view = views[key];
  const { ring, Icon } = toneStyles[view.tone];

  return (
    <main id="main" className="grid min-h-svh place-items-center px-4 py-16">
      <VerificationEvent status={key} />
      <div className="w-full max-w-md text-center">
        <Link href="/" aria-label="BUILD home" className="inline-flex rounded-lg">
          <Logo />
        </Link>
        <div className="mt-10 rounded-3xl bg-surface px-6 py-10 ring-1 ring-border-subtle shadow-[0_24px_48px_-32px_rgba(15,16,19,0.35)] sm:px-10">
          <span className={cn("mx-auto grid size-12 place-items-center rounded-full", ring)}>
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{view.title}</h1>
          <p className="mt-3 text-body text-foreground-muted text-pretty">{view.body}</p>
          <Link href={view.action.href} className={buttonClasses({ size: "lg", className: "mt-8 w-full sm:w-auto" })}>
            {view.action.label} <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </main>
  );
}
