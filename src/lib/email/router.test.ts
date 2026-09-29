import { describe, expect, it } from "vitest";
import { memoryProvider } from "./dev-providers";
import { createEmailRouter, shouldFallback } from "./router";
import type { EmailProvider } from "./types";

const message = { to: "ada@example.com", subject: "Confirm", html: "<p>x</p>", text: "x", tag: "waitlist-verification" };

function setup() {
  const brevo = memoryProvider("brevo");
  const resend = memoryProvider("resend");
  const logs: Record<string, unknown>[] = [];
  const router = createEmailRouter({ primary: brevo, fallback: resend, log: (f) => logs.push(f) });
  return { brevo, resend, logs, router };
}

describe("shouldFallback", () => {
  it("only for transient failures", () => {
    expect(shouldFallback("transient")).toBe(true);
    expect(shouldFallback("unknown")).toBe(false);
    expect(shouldFallback("permanent")).toBe(false);
    expect(shouldFallback("configuration")).toBe(false);
  });
});

describe("createEmailRouter", () => {
  it("Brevo success → no Resend attempt", async () => {
    const { brevo, resend, router } = setup();
    const r = await router.send(message, { idempotencyKey: "m1" });
    expect(r).toMatchObject({ ok: true, provider: "brevo" });
    expect(r.attempts).toHaveLength(1);
    expect(brevo.sent).toHaveLength(1);
    expect(resend.sent).toHaveLength(0);
  });

  it("Brevo transient failure → Resend attempted with the same message and idempotency key", async () => {
    const { brevo, resend, router } = setup();
    brevo.failNext = "transient";
    const r = await router.send(message, { idempotencyKey: "m1" });
    expect(r).toMatchObject({ ok: true, provider: "resend" });
    expect(r.attempts.map((a) => [a.provider, a.ok, a.failure])).toEqual([
      ["brevo", false, "transient"],
      ["resend", true, undefined],
    ]);
    expect(resend.sent).toEqual([{ ...message, idempotencyKey: "m1" }]);
  });

  it.each(["permanent", "configuration", "unknown"] as const)("Brevo %s failure → Resend NOT attempted", async (failure) => {
    const { brevo, resend, router } = setup();
    brevo.failNext = failure;
    const r = await router.send(message);
    expect(r).toMatchObject({ ok: false, provider: "brevo", failure });
    expect(r.attempts).toHaveLength(1);
    expect(resend.sent).toHaveLength(0);
  });

  it("Brevo transient + Resend failure → overall failure with both attempts", async () => {
    const { brevo, resend, router } = setup();
    brevo.failNext = "transient";
    resend.failNext = "transient";
    const r = await router.send(message);
    expect(r).toMatchObject({ ok: false, provider: "resend", failure: "transient" });
    expect(r.attempts).toHaveLength(2);
  });

  it("no fallback configured → primary result only", async () => {
    const brevo = memoryProvider("brevo");
    brevo.failNext = "transient";
    const r = await createEmailRouter({ primary: brevo, log: () => {} }).send(message);
    expect(r).toMatchObject({ ok: false, failure: "transient" });
    expect(r.attempts).toHaveLength(1);
  });

  it("an adapter that throws is treated as unknown (no fallback, no crash)", async () => {
    const throwing: EmailProvider = {
      name: "brevo",
      send: async () => {
        throw new Error("bug");
      },
    };
    const resend = memoryProvider("resend");
    const r = await createEmailRouter({ primary: throwing, fallback: resend, log: () => {} }).send(message);
    expect(r).toMatchObject({ ok: false, failure: "unknown", errorCode: "adapter_threw" });
    expect(resend.sent).toHaveLength(0);
  });

  it("logs each attempt with the fallback, without addresses or content", async () => {
    const { brevo, logs, router } = setup();
    brevo.failNext = "transient";
    await router.send(message);
    expect(logs).toEqual([
      { category: "waitlist-verification", provider: "brevo", result: "failure", failure_class: "transient", error_code: "simulated", fallback: "resend" },
      { category: "waitlist-verification", provider: "resend", result: "success", is_fallback: true },
    ]);
    expect(JSON.stringify(logs)).not.toContain("ada@example.com");
  });
});
