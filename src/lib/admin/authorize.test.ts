import { describe, expect, it } from "vitest";
import { decideSignIn, type AdminRecord, type SignInAttempt, type SignInContext } from "./authorize";

const attempt = (over: Partial<SignInAttempt> = {}): SignInAttempt => ({
  subject: "google-sub-1",
  email: "Owner@Gmail.com",
  emailVerified: true,
  ...over,
});

const ctx = (over: Partial<SignInContext> = {}): SignInContext => ({
  bySubject: null,
  byEmail: null,
  adminCount: 0,
  bootstrapEmails: ["owner@gmail.com"],
  ...over,
});

const admin = (over: Partial<AdminRecord> = {}): AdminRecord => ({
  id: 1,
  email: "owner@gmail.com",
  providerSubject: "google-sub-1",
  status: "active",
  ...over,
});

describe("decideSignIn", () => {
  it("allows an active admin matched by OAuth subject", () => {
    expect(decideSignIn(attempt(), ctx({ bySubject: admin(), adminCount: 1 }))).toEqual({ kind: "allow", adminId: 1 });
  });

  it("keeps each of the three existing Google identities on the same admin record on repeat sign-in", () => {
    for (const [index, email] of ["one@example.com", "two@example.com", "three@example.com"].entries()) {
      const id = index + 1;
      const subject = `google-sub-${id}`;
      const existing = admin({ id, email, providerSubject: subject });
      const context = ctx({ bySubject: existing, adminCount: 3, bootstrapEmails: [] });
      const signedIn = attempt({ email, subject });

      expect(decideSignIn(signedIn, context)).toEqual({ kind: "allow", adminId: id });
      expect(decideSignIn(signedIn, context)).toEqual({ kind: "allow", adminId: id });
    }
  });

  it("denies a disabled admin even with a matching subject", () => {
    const d = decideSignIn(attempt(), ctx({ bySubject: admin({ status: "disabled" }), adminCount: 1 }));
    expect(d).toEqual({ kind: "deny", reason: "disabled" });
  });

  it("trusts the subject over the email (admin changed their Google email)", () => {
    const d = decideSignIn(attempt({ email: "renamed@gmail.com" }), ctx({ bySubject: admin(), adminCount: 1 }));
    expect(d.kind).toBe("allow");
  });

  it("bootstraps the first admin only for a configured bootstrap email, case-insensitively", () => {
    expect(decideSignIn(attempt(), ctx())).toEqual({ kind: "bootstrap" });
  });

  it("allows the second and third configured bootstrap emails while capacity remains", () => {
    expect(
      decideSignIn(attempt({ email: "second@gmail.com", subject: "google-sub-2" }), ctx({ adminCount: 1, bootstrapEmails: ["owner@gmail.com", "second@gmail.com", "third@gmail.com"] }))
    ).toEqual({ kind: "bootstrap" });
    expect(
      decideSignIn(attempt({ email: "third@gmail.com", subject: "google-sub-3" }), ctx({ adminCount: 2, bootstrapEmails: ["owner@gmail.com", "second@gmail.com", "third@gmail.com"] }))
    ).toEqual({ kind: "bootstrap" });
  });

  it("denies an unconfigured fourth email before all administrator records exist", () => {
    expect(
      decideSignIn(
        attempt({ email: "fourth@example.com", subject: "google-sub-4" }),
        ctx({ adminCount: 2, bootstrapEmails: ["one@example.com", "two@example.com", "three@example.com"] }),
      ),
    ).toEqual({ kind: "deny", reason: "not_authorized" });
  });

  it("denies bootstrap once the configured capacity is exhausted", () => {
    expect(decideSignIn(attempt({ email: "fourth@gmail.com", subject: "google-sub-4" }), ctx({ adminCount: 3, bootstrapEmails: ["owner@gmail.com", "second@gmail.com", "third@gmail.com", "fourth@gmail.com"] }))).toEqual({ kind: "deny", reason: "not_authorized" });
  });

  it("counts disabled rows against bootstrap capacity, so a seat is not reopened by config", () => {
    expect(
      decideSignIn(attempt({ email: "owner@gmail.com" }), ctx({ adminCount: 3, bootstrapEmails: ["owner@gmail.com", "second@gmail.com", "third@gmail.com"] }))
    ).toEqual({ kind: "deny", reason: "not_authorized" });
  });

  it("denies bootstrap when no bootstrap email is configured", () => {
    expect(decideSignIn(attempt(), ctx({ bootstrapEmails: [] }))).toEqual({ kind: "deny", reason: "not_authorized" });
  });

  it("denies a stranger with a valid Google account", () => {
    const d = decideSignIn(attempt({ email: "someone@gmail.com", subject: "other" }), ctx({ adminCount: 1 }));
    expect(d).toEqual({ kind: "deny", reason: "not_authorized" });
  });

  it("requires a verified email for anything decided by email", () => {
    expect(decideSignIn(attempt({ emailVerified: false }), ctx())).toEqual({ kind: "deny", reason: "unverified_email" });
    const provisioned = admin({ providerSubject: null });
    expect(decideSignIn(attempt({ emailVerified: false }), ctx({ byEmail: provisioned, adminCount: 1 }))).toEqual({
      kind: "deny",
      reason: "unverified_email",
    });
  });

  it("binds the Google identity of an admin provisioned by email", () => {
    const provisioned = admin({ id: 7, providerSubject: null });
    expect(decideSignIn(attempt(), ctx({ byEmail: provisioned, adminCount: 1 }))).toEqual({ kind: "bind", adminId: 7 });
  });

  it("refuses to re-bind an email already tied to a different Google account", () => {
    const bound = admin({ providerSubject: "someone-else" });
    expect(decideSignIn(attempt(), ctx({ byEmail: bound, adminCount: 1 }))).toEqual({ kind: "deny", reason: "subject_mismatch" });
  });

  it("denies a provisioned-but-disabled admin", () => {
    const disabled = admin({ providerSubject: null, status: "disabled" });
    expect(decideSignIn(attempt(), ctx({ byEmail: disabled, adminCount: 1 }))).toEqual({ kind: "deny", reason: "disabled" });
  });
});
