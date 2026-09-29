import { describe, expect, it } from "vitest";
import { waitlistVerificationEmail } from "./waitlist-verification";

const input = {
  to: "ada@example.com",
  verifyUrl: "https://build.example/api/waitlist/verify?token=abc_DEF-123",
  siteUrl: "https://build.example",
  ttlHours: 24,
};

describe("waitlistVerificationEmail", () => {
  it("has a subject and both html and text bodies", () => {
    const m = waitlistVerificationEmail(input);
    expect(m.to).toBe("ada@example.com");
    expect(m.subject).toMatch(/confirm your email/i);
    expect(m.html).toContain("<!doctype html>");
    expect(m.text).toContain("You're almost in.");
  });

  it("offers a button AND a written-out link, both to the same verify URL", () => {
    const { html } = waitlistVerificationEmail(input);
    const hrefs = [...html.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, label]) => ({ href, label }));
    const verifyLinks = hrefs.filter((l) => l.href === input.verifyUrl);
    expect(verifyLinks).toHaveLength(2);
    expect(verifyLinks.some((l) => l.label.includes("Verify my email"))).toBe(true);
    expect(verifyLinks.some((l) => l.label === input.verifyUrl)).toBe(true);
  });

  it("includes the link in the plain-text version", () => {
    expect(waitlistVerificationEmail(input).text).toContain(input.verifyUrl);
  });

  it("states the expiry", () => {
    expect(waitlistVerificationEmail(input).text).toContain("expires in 1 day");
    expect(waitlistVerificationEmail({ ...input, ttlHours: 2 }).html).toContain("expires in 2 hours");
    expect(waitlistVerificationEmail({ ...input, ttlHours: 48 }).text).toContain("expires in 2 days");
  });

  it("escapes values placed into HTML", () => {
    const m = waitlistVerificationEmail({ ...input, to: '"><script>x</script>@example.com' });
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
  });

  it("makes no launch-date or access promises", () => {
    const { html, text } = waitlistVerificationEmail(input);
    for (const body of [html, text]) expect(body).not.toMatch(/guarantee|launch(es|ing)? on|days? until/i);
  });
});
