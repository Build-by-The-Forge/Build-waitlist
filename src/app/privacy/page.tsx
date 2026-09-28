import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Privacy — BUILD",
  description: "How BUILD handles the information you share when you join the waitlist.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="28 September 2026">
      <section>
        <h2>What we collect</h2>
        <p>When you join the BUILD waitlist, we store:</p>
        <ul>
          <li>your email address;</li>
          <li>which signup form you used on this page;</li>
          <li>the date and time you signed up.</li>
        </ul>
        <p className="mt-3">We don&rsquo;t ask for your name, school, or any other personal details for the waitlist.</p>
      </section>
      <section>
        <h2>Why we collect it</h2>
        <p>
          We use your email only to tell you about BUILD&rsquo;s launch, early access, and closely related product
          updates. We do not sell your email or share it for anyone else&rsquo;s marketing.
        </p>
      </section>
      <section>
        <h2>Usage analytics</h2>
        <p>
          We may measure how visitors use this page, such as which buttons are clicked and whether the signup form was
          submitted, so we can improve it. These measurements are not used to identify you.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          Every email we send includes a way to unsubscribe. You can also ask us to delete your email from the waitlist
          at any time by replying to any message we send you.
        </p>
      </section>
    </LegalPage>
  );
}
