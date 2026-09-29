import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmailRouterFromEnv, EmailNotConfiguredError } from "./index";
import { memoryProvider } from "./dev-providers";
import { formatSender, parseSender } from "./sender";

const message = { to: "ada@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi", tag: "t" };
const base = { EMAIL_FROM: "hello@build.example", EMAIL_FROM_NAME: "BUILD" };

/** Captures which providers the router actually calls, by intercepting fetch. */
function stubFetch(status = 200) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(new URL(url).host);
      return new Response(JSON.stringify(status < 300 ? { id: "x", messageId: "y" } : { code: "x" }), { status });
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createEmailRouterFromEnv", () => {
  it("defaults to console outside production", () => {
    expect(createEmailRouterFromEnv({ NODE_ENV: "development" }).name).toBe("console");
  });

  it("refuses to run unconfigured or with console in production", () => {
    expect(() => createEmailRouterFromEnv({ NODE_ENV: "production" })).toThrow(EmailNotConfiguredError);
    expect(() => createEmailRouterFromEnv({ NODE_ENV: "production", EMAIL_PROVIDER: "console" })).toThrow(EmailNotConfiguredError);
  });

  it("rejects unknown or self-referencing provider settings", () => {
    expect(() => createEmailRouterFromEnv({ EMAIL_PROVIDER: "carrier-pigeon" })).toThrow(/unknown EMAIL_PROVIDER/);
    expect(() => createEmailRouterFromEnv({ ...base, EMAIL_PROVIDER: "brevo", EMAIL_FALLBACK_PROVIDER: "pigeon" })).toThrow(/unknown EMAIL_FALLBACK/);
    expect(() => createEmailRouterFromEnv({ ...base, EMAIL_PROVIDER: "brevo", EMAIL_FALLBACK_PROVIDER: "brevo" })).toThrow(/must differ/);
  });

  it("canonical setup: Brevo primary, Resend fallback when its key is set", async () => {
    const calls = stubFetch(503);
    const router = createEmailRouterFromEnv({ ...base, EMAIL_PROVIDER: "brevo", BREVO_API_KEY: "b", RESEND_API_KEY: "r" });
    expect(router.name).toBe("brevo");
    const r = await router.send(message);
    expect(calls).toEqual(["api.brevo.com", "api.resend.com"]);
    expect(r.attempts.map((a) => a.provider)).toEqual(["brevo", "resend"]);
  });

  it("no fallback without the other key, or with EMAIL_FALLBACK_PROVIDER=none", async () => {
    let calls = stubFetch(503);
    await createEmailRouterFromEnv({ ...base, EMAIL_PROVIDER: "brevo", BREVO_API_KEY: "b" }).send(message);
    expect(calls).toEqual(["api.brevo.com"]);

    calls = stubFetch(503);
    await createEmailRouterFromEnv({ ...base, EMAIL_PROVIDER: "brevo", BREVO_API_KEY: "b", RESEND_API_KEY: "r", EMAIL_FALLBACK_PROVIDER: "none" }).send(message);
    expect(calls).toEqual(["api.brevo.com"]);
  });

  it("Resend can be primary with Brevo as fallback", async () => {
    const calls = stubFetch(503);
    await createEmailRouterFromEnv({ ...base, EMAIL_PROVIDER: "resend", BREVO_API_KEY: "b", RESEND_API_KEY: "r" }).send(message);
    expect(calls).toEqual(["api.resend.com", "api.brevo.com"]);
  });

  it("a missing primary key fails as configuration, logs server-side, and doesn't fall back", async () => {
    const calls = stubFetch(200);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    const r = await createEmailRouterFromEnv({ ...base, EMAIL_PROVIDER: "brevo", RESEND_API_KEY: "r" }).send(message);
    expect(r).toMatchObject({ ok: false, failure: "configuration", errorCode: "not_configured" });
    expect(calls).toEqual([]);
    expect(error.mock.calls[0][0]).toContain("BREVO_API_KEY is missing");
  });

  it("an invalid sender is a configuration failure", async () => {
    stubFetch(200);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    const r = await createEmailRouterFromEnv({ EMAIL_PROVIDER: "brevo", BREVO_API_KEY: "b", EMAIL_FROM: "nope" }).send(message);
    expect(r).toMatchObject({ ok: false, failure: "configuration" });
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
