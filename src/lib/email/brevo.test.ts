import { describe, expect, it, vi } from "vitest";
import { brevoProvider } from "./brevo";

const message = { to: "ada@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi", tag: "waitlist-verification" };
const from = { email: "hello@build.example", name: "BUILD" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe("brevoProvider", () => {
  it("sends through the transactional API with sender, reply-to, tag and trace header", async () => {
    const fetch = vi.fn(async () => json(201, { messageId: "<202609291200.123@smtp-relay.mailin.fr>" }));
    const p = brevoProvider({ apiKey: "xkeysib-secret", from, replyTo: "team@build.example", fetch });
    expect(await p.send(message, { idempotencyKey: "msg-1" })).toEqual({
      ok: true,
      provider: "brevo",
      providerMessageId: "<202609291200.123@smtp-relay.mailin.fr>",
    });

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init.headers as Record<string, string>)["api-key"]).toBe("xkeysib-secret");
    expect(JSON.parse(init.body as string)).toEqual({
      sender: { email: "hello@build.example", name: "BUILD" },
      to: [{ email: "ada@example.com" }],
      subject: "Hi",
      htmlContent: "<p>Hi</p>",
      textContent: "Hi",
      replyTo: { email: "team@build.example" },
      tags: ["waitlist-verification"],
      headers: { "X-BUILD-Message-Id": "msg-1" },
    });
  });

  it("omits optional fields when not configured", async () => {
    const fetch = vi.fn(async () => json(201, { messageId: "m" }));
    await brevoProvider({ apiKey: "k", from: { email: "a@b.co" }, fetch }).send({ ...message, tag: undefined });
    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.sender).toEqual({ email: "a@b.co" });
    expect(body).not.toHaveProperty("replyTo");
    expect(body).not.toHaveProperty("tags");
    expect(body).not.toHaveProperty("headers");
  });

  it.each([
    [402, "not_enough_credits", "transient"],
    [401, "unauthorized", "configuration"],
    [403, "permission_denied", "configuration"],
    [400, "account_under_validation", "configuration"],
    [400, "invalid_parameter", "permanent"],
    [400, "missing_parameter", "permanent"],
    [429, undefined, "transient"],
    [500, undefined, "transient"],
    [502, undefined, "transient"],
    [504, undefined, "unknown"],
  ] as const)("HTTP %i %s → %s", async (status, code, failure) => {
    const fetch = vi.fn(async () => json(status, code ? { code, message: "details" } : {}));
    const r = await brevoProvider({ apiKey: "xkeysib-secret", from, fetch }).send(message);
    expect(r).toMatchObject({ ok: false, provider: "brevo", failure, httpStatus: status, errorCode: code ?? String(status) });
    expect(JSON.stringify(r)).not.toContain("xkeysib-secret");
  });

  it("connection refused → transient; our timeout → unknown", async () => {
    const refused = vi.fn(async () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
    });
    expect(await brevoProvider({ apiKey: "k", from, fetch: refused }).send(message)).toMatchObject({ failure: "transient", errorCode: "ENOTFOUND" });

    const timedOut = vi.fn(async () => {
      throw Object.assign(new Error("aborted"), { name: "TimeoutError" });
    });
    expect(await brevoProvider({ apiKey: "k", from, fetch: timedOut }).send(message)).toMatchObject({ failure: "unknown" });
  });
});
