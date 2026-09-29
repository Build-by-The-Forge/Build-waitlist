import { describe, expect, it } from "vitest";
import { createEmailProvider, EmailNotConfiguredError } from "./index";
import { memoryProvider } from "./dev-providers";
import { formatSender, parseSender } from "./sender";

const message = { to: "ada@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

describe("createEmailProvider", () => {
  it("defaults to console outside production", () => {
    expect(createEmailProvider({ NODE_ENV: "development" }).name).toBe("console");
  });

  it("refuses to run unconfigured or with console in production", () => {
    expect(() => createEmailProvider({ NODE_ENV: "production" })).toThrow(EmailNotConfiguredError);
    expect(() => createEmailProvider({ NODE_ENV: "production", EMAIL_PROVIDER: "console" })).toThrow(EmailNotConfiguredError);
  });

  it("requires a key and a valid sender for resend", () => {
    expect(() => createEmailProvider({ EMAIL_PROVIDER: "resend", EMAIL_FROM: "a@b.co" })).toThrow(/RESEND_API_KEY/);
    expect(() => createEmailProvider({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "k" })).toThrow(/EMAIL_FROM/);
    expect(() => createEmailProvider({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "k", EMAIL_FROM: "nope" })).toThrow(/EMAIL_FROM/);
    expect(createEmailProvider({ EMAIL_PROVIDER: "Resend", RESEND_API_KEY: "k", EMAIL_FROM: "a@b.co" }).name).toBe("resend");
  });

  it("rejects unknown providers", () => {
    expect(() => createEmailProvider({ EMAIL_PROVIDER: "carrier-pigeon" })).toThrow(/unknown/);
  });
});

describe("sender", () => {
  it("accepts a bare address, with the name from EMAIL_FROM_NAME", () => {
    expect(parseSender("hello@build.example", "BUILD")).toEqual({ email: "hello@build.example", name: "BUILD" });
    expect(parseSender("hello@build.example")).toEqual({ email: "hello@build.example", name: undefined });
  });

  it("accepts the legacy 'Name <address>' form", () => {
    expect(parseSender("BUILD <hello@build.example>")).toEqual({ email: "hello@build.example", name: "BUILD" });
    expect(parseSender('"BUILD Team" <hello@build.example>', "Override")).toEqual({ email: "hello@build.example", name: "Override" });
  });

  it("rejects missing or malformed senders", () => {
    expect(parseSender(undefined)).toBeNull();
    expect(parseSender("not-an-address")).toBeNull();
  });

  it("formats for single-string APIs, quoting unusual names", () => {
    expect(formatSender({ email: "a@b.co", name: "BUILD" })).toBe("BUILD <a@b.co>");
    expect(formatSender({ email: "a@b.co" })).toBe("a@b.co");
    expect(formatSender({ email: "a@b.co", name: 'BUILD, "Team"' })).toBe('"BUILD, Team" <a@b.co>');
  });
});

describe("memoryProvider", () => {
  it("records messages with their idempotency key and can simulate failures", async () => {
    const p = memoryProvider();
    p.failNext = "transient";
    expect(await p.send(message)).toMatchObject({ ok: false, failure: "transient" });
    expect(await p.send(message, { idempotencyKey: "k1" })).toMatchObject({ ok: true });
    expect(p.sent).toEqual([{ ...message, idempotencyKey: "k1" }]);
  });
});
