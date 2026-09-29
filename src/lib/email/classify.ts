/** See the FailureClass docs in ./types. */
export type FailureClass = "transient" | "unknown" | "permanent" | "configuration";

/**
 * Classifies a thrown fetch error. The key question is whether the request
 * could have reached the provider: if it provably didn't, the fallback is
 * safe; if it might have, the outcome is unknown.
 */
const NEVER_SENT = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "UND_ERR_CONNECT_TIMEOUT", // TCP/TLS connect never completed
  "CERT_HAS_EXPIRED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

export function classifyNetworkError(err: unknown): { failure: FailureClass; errorCode: string } {
  const e = err as { name?: string; code?: string; cause?: { code?: string; name?: string } } | undefined;
  const code = e?.cause?.code ?? e?.code ?? e?.cause?.name ?? e?.name ?? "unknown_error";
  if (NEVER_SENT.has(code)) return { failure: "transient", errorCode: code };
  // Our own AbortSignal.timeout, a reset mid-request, a closed socket: the
  // provider may already have accepted the message.
  return { failure: "unknown", errorCode: code };
}

/** Classifies a provider HTTP error status. */
export function classifyHttpStatus(status: number): FailureClass {
  if (status === 401 || status === 403) return "configuration";
  if (status === 429) return "transient"; // explicitly not accepted
  if (status === 504) return "unknown"; // gateway gave up; upstream may have accepted
  if (status >= 500) return "transient";
  return "permanent"; // 400, 404, 422, ...
}
