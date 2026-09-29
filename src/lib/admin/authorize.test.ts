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
  bootstrapEmail: "owner@gmail.com",
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

  it("denies a disabled admin even with a matching subject", () => {
    const d = decideSignIn(attempt(), ctx({ bySubject: admin({ status: "disabled" }), adminCount: 1 }));
    expect(d).toEqual({ kind: "deny", reason: "disabled" });
  });

  it("trusts the subject over the email (admin changed their Google email)", () => {
    const d = decideSignIn(attempt({ email: "renamed@gmail.com" }), ctx({ bySubject: admin(), adminCount: 1 }));
    expect(d.kind).toBe("allow");
  });

  it("bootstraps the first admin only for the bootstrap email, case-insensitively", () => {
    expect(decideSignIn(attempt(), ctx())).toEqual({ kind: "bootstrap" });
  });

  it("never bootstraps once any admin row exists, even a disabled one", () => {
    expect(decideSignIn(attempt(), ctx({ adminCount: 1 }))).toEqual({ kind: "deny", reason: "not_authorized" });
  });

  it("denies bootstrap when no bootstrap email is configured", () => {
    expect(decideSignIn(attempt(), ctx({ bootstrapEmail: null }))).toEqual({ kind: "deny", reason: "not_authorized" });
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
