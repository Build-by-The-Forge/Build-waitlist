import { describe, expect, it, vi } from "vitest";
import { resendProvider } from "./resend";

const message = { to: "ada@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi", tag: "waitlist-verification" };
const from = { email: "hello@build.example", name: "BUILD" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe("resendProvider", () => {
  it("sends with auth, sender name, reply-to, tag and idempotency key", async () => {
    const fetch = vi.fn(async () => json(200, { id: "re_123" }));
    const p = resendProvider({ apiKey: "secret-key", from, replyTo: "team@build.example", fetch });
    expect(await p.send(message, { idempotencyKey: "msg-1" })).toEqual({ ok: true, provider: "resend", providerMessageId: "re_123" });

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe("https://api.resend.com/emails");
    expect(headers.Authorization).toBe("Bearer secret-key");
    expect(headers["Idempotency-Key"]).toBe("msg-1");
    expect(JSON.parse(init.body as string)).toMatchObject({
      from: "BUILD <hello@build.example>",
      to: ["ada@example.com"],
      reply_to: "team@build.example",
      subject: "Hi",
      tags: [{ name: "category", value: "waitlist-verification" }],
    });
  });

  it.each([
    [500, "transient"],
    [503, "transient"],
    [429, "transient"],
    [504, "unknown"],
    [409, "unknown"],
    [422, "permanent"],
    [401, "configuration"],
    [403, "configuration"],
  ] as const)("HTTP %i → %s", async (status, failure) => {
    const fetch = vi.fn(async () => json(status, { name: "some_error" }));
    const r = await resendProvider({ apiKey: "secret-key", from, fetch }).send(message);
    expect(r).toMatchObject({ ok: false, provider: "resend", failure, httpStatus: status, errorCode: "some_error" });
    expect(JSON.stringify(r)).not.toContain("secret-key");
  });

  it("connection refused → transient; timeout → unknown", async () => {
    const refused = vi.fn(async () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    });
    expect(await resendProvider({ apiKey: "k", from, fetch: refused }).send(message)).toMatchObject({ ok: false, failure: "transient" });

    const timedOut = vi.fn(async () => {
      throw Object.assign(new Error("aborted"), { name: "TimeoutError" });
    });
    expect(await resendProvider({ apiKey: "k", from, fetch: timedOut }).send(message)).toMatchObject({ ok: false, failure: "unknown" });
  });

  it("tolerates a non-JSON success body", async () => {
    const fetch = vi.fn(async () => new Response("ok", { status: 200 }));
    expect(await resendProvider({ apiKey: "k", from, fetch }).send(message)).toEqual({ ok: true, provider: "resend", providerMessageId: undefined });
  });
});
