import { classifyHttpStatus, classifyNetworkError } from "./classify";
import type { Sender } from "./sender";
import type { EmailMessage, EmailProvider, EmailSendResult, FailureClass, SendOptions } from "./types";

type BrevoConfig = { apiKey: string; from: Sender; replyTo?: string; fetch?: typeof fetch; timeoutMs?: number };

/** Brevo error codes that override the plain HTTP-status classification. */
const CODE_CLASS: Record<string, FailureClass> = {
  not_enough_credits: "transient", // quota exhausted: explicitly NOT accepted, so the fallback can take it
  unauthorized: "configuration", // bad key, or an IP blocked by "Authorised IPs"
  permission_denied: "configuration", // e.g. sender not verified
  account_under_validation: "configuration",
};

/**
 * Brevo adapter (POST https://api.brevo.com/v3/smtp/email), plain HTTP, no SDK.
 *
 * Brevo has no idempotency-key support, so it can't deduplicate retries. The
 * logical message id travels as a custom header for tracing, and the router
 * never falls back after an "unknown" outcome to avoid sending twice.
 */
export function brevoProvider({ apiKey, from, replyTo, fetch: fetchImpl = fetch, timeoutMs = 10_000 }: BrevoConfig): EmailProvider {
  return {
    name: "brevo",
    async send(message: EmailMessage, options: SendOptions = {}): Promise<EmailSendResult> {
      let res: Response;
      try {
        res = await fetchImpl("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            sender: { email: from.email, ...(from.name ? { name: from.name } : {}) },
            to: [{ email: message.to }],
            subject: message.subject,
            htmlContent: message.html,
            textContent: message.text,
            ...(replyTo ? { replyTo: { email: replyTo } } : {}),
            ...(message.tag ? { tags: [message.tag] } : {}),
            ...(options.idempotencyKey ? { headers: { "X-BUILD-Message-Id": options.idempotencyKey } } : {}),
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        return { ok: false, provider: "brevo", ...classifyNetworkError(err) };
      }

      const body = (await res.json().catch(() => ({}))) as { messageId?: string; code?: string };
      if (res.ok) return { ok: true, provider: "brevo", providerMessageId: body.messageId };

      const code = typeof body.code === "string" ? body.code : undefined;
      const failure = (code && CODE_CLASS[code]) || classifyHttpStatus(res.status);
      return { ok: false, provider: "brevo", failure, httpStatus: res.status, errorCode: (code ?? String(res.status)).slice(0, 64) };
    },
  };
}
