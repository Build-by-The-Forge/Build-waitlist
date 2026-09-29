import { describe, expect, it } from "vitest";
import { checkMailDomain } from "./domain";

const notFound = () => Promise.reject(Object.assign(new Error("nx"), { code: "ENOTFOUND" }));
const noData = () => Promise.reject(Object.assign(new Error("nodata"), { code: "ENODATA" }));
const servfail = () => Promise.reject(Object.assign(new Error("servfail"), { code: "ESERVFAIL" }));

function resolver(over: Partial<Record<"resolveMx" | "resolve4" | "resolve6", () => Promise<never> | Promise<unknown>>>) {
  return {
    resolveMx: over.resolveMx ?? noData,
    resolve4: over.resolve4 ?? noData,
    resolve6: over.resolve6 ?? noData,
  } as Parameters<typeof checkMailDomain>[1];
}

describe("checkMailDomain", () => {
  it("accepts domains with MX records", async () => {
    const r = resolver({ resolveMx: async () => [{ exchange: "mx.example.com", priority: 10 }] });
    expect(await checkMailDomain("example.com", r)).toBe("ok");
  });

  it("rejects an RFC 7505 null MX", async () => {
    const r = resolver({ resolveMx: async () => [{ exchange: "", priority: 0 }] });
    expect(await checkMailDomain("nomail.example", r)).toBe("no_mail");
  });

  it("falls back to A/AAAA records when there is no MX", async () => {
    expect(await checkMailDomain("a.example", resolver({ resolve4: async () => ["192.0.2.1"] }))).toBe("ok");
    expect(await checkMailDomain("aaaa.example", resolver({ resolve6: async () => ["2001:db8::1"] }))).toBe("ok");
  });

  it("rejects domains that don't exist", async () => {
    const r = resolver({ resolveMx: notFound, resolve4: notFound, resolve6: notFound });
    expect(await checkMailDomain("not-a-domain.invalid", r)).toBe("no_mail");
  });

  it("fails open on resolver trouble", async () => {
    expect(await checkMailDomain("x.example", resolver({ resolveMx: servfail }))).toBe("unknown");
    expect(await checkMailDomain("y.example", resolver({ resolve4: servfail }))).toBe("unknown");
  });

  it("fails open on timeouts", async () => {
    const slow = resolver({ resolveMx: () => new Promise(() => {}) });
    expect(await checkMailDomain("slow.example", slow, 20)).toBe("unknown");
  });
});
