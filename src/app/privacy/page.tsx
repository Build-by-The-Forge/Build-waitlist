import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Privacy — BUILD",
  description: "How BUILD handles the information you share when you join the waitlist.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="29 September 2026">
      <section>
        <h2>What we collect</h2>
        <p>When you join the BUILD waitlist, we store:</p>
        <ul>
          <li>your email address;</li>
          <li>which button on this page led you to sign up (for example, the top of the page or the menu);</li>
          <li>the date and time you signed up;</li>
          <li>whether you&rsquo;ve confirmed your email, and when.</li>
        </ul>
        <p className="mt-3">We don&rsquo;t ask for your name, school, or any other personal details for the waitlist.</p>
      </section>
      <section>
        <h2>Confirming your email</h2>
        <p>
          After you sign up, we send one email with a link (and a button) to confirm the address is yours. You&rsquo;re
          only on the waitlist once you click it. This stops people from signing up addresses that aren&rsquo;t theirs.
        </p>
        <p className="mt-3">
          Each link works once and expires after 24 hours. We keep only a scrambled (hashed) version of the link&rsquo;s
          code, and delete it as soon as you confirm. If you ask us to resend the email, the previous link stops
          working. If you didn&rsquo;t sign up, you can ignore the email and nothing further happens.
        </p>
        <p className="mt-3">
          To prevent abuse, we briefly keep counters of recent requests. These use one-way scrambled identifiers, not
          your IP address or email in readable form, and are cleared after about two days.
        </p>
      </section>
      <section>
        <h2>Why we collect it</h2>
        <p>
          We use your email only to confirm your signup and to tell you about BUILD&rsquo;s launch, early access, and
          closely related product updates. We do not sell your email or share it for anyone else&rsquo;s marketing.
        </p>
      </section>
      <section>
        <h2>Where it&rsquo;s stored and who processes it</h2>
        <p>
          Waitlist data is stored in a database hosted by Supabase. The website runs on Vercel. Confirmation emails are
          sent through Brevo, with Resend as a backup if Brevo is unavailable. Each receives your email address only
          to deliver our messages. We keep a record of which service sent each confirmation email (never the email&rsquo;s
          contents or its link) so we can troubleshoot delivery.
        </p>
      </section>
      <section>
        <h2>Usage analytics</h2>
        <p>
          We may measure how visitors use this page, such as which buttons are clicked, whether the signup form was
          submitted, and whether a confirmation link worked, so we can improve it. These measurements don&rsquo;t include
          your email address and are not used to identify you.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          Updates we send about BUILD include a way to unsubscribe. The one-time confirmation email is only sent because
          you (or someone using your address) asked for it. You can ask us to delete your email from the waitlist at any
          time by replying to one of our emails.
        </p>
      </section>
    </LegalPage>
  );
}
