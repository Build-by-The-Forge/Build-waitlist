import { promises as dns } from "node:dns";

/**
 * Can this domain receive email at all? A cheap pre-check before we send a
 * verification email, so typos like "gmial.con" fail fast.
 *
 * It does NOT prove the mailbox exists; only the verification email does
 * that. No SMTP probing. DNS failures that aren't a clear "doesn't exist"
 * (timeouts, resolver trouble) fail open: a flaky resolver must not turn
 * away real people.
 */
export type DomainCheck = "ok" | "no_mail" | "unknown";

type Resolver = {
  resolveMx(domain: string): Promise<{ exchange: string; priority: number }[]>;
  resolve4(domain: string): Promise<string[]>;
  resolve6(domain: string): Promise<string[]>;
};

const NOT_FOUND = new Set(["ENOTFOUND", "ENODATA", "ENONAME", "NXDOMAIN"]);

function isNotFound(err: unknown) {
  return typeof err === "object" && err !== null && NOT_FOUND.has((err as { code?: string }).code ?? "");
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

export async function checkMailDomain(domain: string, resolver: Resolver = dns, timeoutMs = 3000): Promise<DomainCheck> {
  const d = domain.trim().toLowerCase().replace(/\.$/, "");
  try {
    const mx = await withTimeout(resolver.resolveMx(d), timeoutMs);
    // RFC 7505 "null MX": the domain explicitly accepts no mail.
    if (mx.length === 1 && (mx[0].exchange === "" || mx[0].exchange === ".")) return "no_mail";
    if (mx.length > 0) return "ok";
  } catch (err) {
    if (!isNotFound(err)) return "unknown";
  }
  // No MX: mail falls back to the domain's own address records (RFC 5321 §5.1).
  const settled = await Promise.allSettled([withTimeout(resolver.resolve4(d), timeoutMs), withTimeout(resolver.resolve6(d), timeoutMs)]);
  if (settled.some((s) => s.status === "fulfilled" && s.value.length > 0)) return "ok";
  if (settled.every((s) => s.status === "rejected" && isNotFound(s.reason))) return "no_mail";
  return "unknown";
}

const cache = new Map<string, { result: DomainCheck; until: number }>();
const TTL_MS = 10 * 60 * 1000;

/** Cached per instance; common domains (gmail.com, yahoo.com) resolve once. */
export async function mailDomainAccepts(email: string, resolver?: Resolver): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  const hit = cache.get(domain);
  const now = Date.now();
  let result = hit && hit.until > now ? hit.result : undefined;
  if (!result) {
    result = await checkMailDomain(domain, resolver);
    if (result !== "unknown") cache.set(domain, { result, until: now + TTL_MS });
  }
  return result !== "no_mail";
}
