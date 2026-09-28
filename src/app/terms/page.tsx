import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Terms — BUILD",
  description: "Terms for using the BUILD waitlist website.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="28 September 2026">
      <section>
        <h2>The waitlist</h2>
        <p>
          Joining the waitlist lets us contact you about BUILD&rsquo;s launch and early access. It doesn&rsquo;t create
          an account, and it doesn&rsquo;t guarantee access by any particular date.
        </p>
      </section>
      <section>
        <h2>Product previews</h2>
        <p>
          Screens, demos and examples on this site illustrate how BUILD is designed to work. They are previews, and the
          product may change before and after launch.
        </p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>
          Please sign up only with an email address you own, and don&rsquo;t attempt to abuse, overload or automate
          signups on this site.
        </p>
      </section>
      <section>
        <h2>Privacy</h2>
        <p>
          How we handle your information is described in our <a href="/privacy" className="text-foreground underline underline-offset-4">privacy notice</a>.
        </p>
      </section>
    </LegalPage>
  );
}
