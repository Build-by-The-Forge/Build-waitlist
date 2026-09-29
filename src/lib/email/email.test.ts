import { describe, expect, it, vi } from "vitest";
import { createEmailProvider, EmailDeliveryError, EmailNotConfiguredError } from "./index";
import { memoryProvider, resendProvider } from "./providers";

const message = { to: "ada@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

describe("createEmailProvider", () => {
  it("defaults to console outside production", () => {
    expect(createEmailProvider({ NODE_ENV: "development" }).name).toBe("console");
  });

  it("refuses to run unconfigured or with console in production", () => {
    expect(() => createEmailProvider({ NODE_ENV: "production" })).toThrow(EmailNotConfiguredError);
    expect(() => createEmailProvider({ NODE_ENV: "production", EMAIL_PROVIDER: "console" })).toThrow(EmailNotConfiguredError);
  });

  it("requires key and sender for resend", () => {
    expect(() => createEmailProvider({ EMAIL_PROVIDER: "resend", EMAIL_FROM: "a@b.co" })).toThrow(/EMAIL_API_KEY/);
    expect(() => createEmailProvider({ EMAIL_PROVIDER: "resend", EMAIL_API_KEY: "k" })).toThrow(/EMAIL_FROM/);
    expect(createEmailProvider({ EMAIL_PROVIDER: "Resend", EMAIL_API_KEY: "k", EMAIL_FROM: "a@b.co" }).name).toBe("resend");
  });

  it("rejects unknown providers", () => {
    expect(() => createEmailProvider({ EMAIL_PROVIDER: "carrier-pigeon" })).toThrow(/unknown/);
  });
});

describe("resendProvider", () => {
  it("posts the message with auth and returns the id", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ id: "re_123" }), { status: 200 }));
    const p = resendProvider({ apiKey: "secret-key", from: "BUILD <hello@build.example>", replyTo: "team@build.example", fetch });
    await expect(p.send(message)).resolves.toEqual({ id: "re_123" });

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret-key");
    expect(JSON.parse(init.body as string)).toMatchObject({
      from: "BUILD <hello@build.example>",
      to: ["ada@example.com"],
      reply_to: "team@build.example",
      subject: "Hi",
    });
  });

  it("raises a safe delivery error on API failure, without leaking the key", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ name: "validation_error" }), { status: 403 }));
    const p = resendProvider({ apiKey: "secret-key", from: "a@b.co", fetch });
    const err = await p.send(message).catch((e) => e);
    expect(err).toBeInstanceOf(EmailDeliveryError);
    expect(err.status).toBe(403);
    expect(err.message).toContain("validation_error");
    expect(err.message).not.toContain("secret-key");
  });

  it("wraps network errors", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const err = await resendProvider({ apiKey: "k", from: "a@b.co", fetch }).send(message).catch((e) => e);
    expect(err).toBeInstanceOf(EmailDeliveryError);
  });
});

describe("memoryProvider", () => {
  it("records messages and can simulate one failure", async () => {
    const p = memoryProvider();
    p.failNext = true;
    await expect(p.send(message)).rejects.toBeInstanceOf(EmailDeliveryError);
    await p.send(message);
    expect(p.sent).toHaveLength(1);
  });
});
