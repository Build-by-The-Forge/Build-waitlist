import { classifyHttpStatus, classifyNetworkError } from "./classify";
import { formatSender, type Sender } from "./sender";
import type { EmailMessage, EmailProvider, EmailSendResult, SendOptions } from "./types";

type ResendConfig = { apiKey: string; from: Sender; replyTo?: string; fetch?: typeof fetch; timeoutMs?: number };

/**
 * Resend adapter (https://resend.com/docs/api-reference/emails/send-email),
 * plain HTTP, no SDK. Supports idempotency keys, so a retried logical email
 * is deduplicated by Resend for 24 hours.
 */
export function resendProvider({ apiKey, from, replyTo, fetch: fetchImpl = fetch, timeoutMs = 10_000 }: ResendConfig): EmailProvider {
  return {
    name: "resend",
    async send(message: EmailMessage, options: SendOptions = {}): Promise<EmailSendResult> {
      let res: Response;
      try {
        res = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
          },
          body: JSON.stringify({
            from: formatSender(from),
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
            ...(replyTo ? { reply_to: replyTo } : {}),
            ...(message.tag ? { tags: [{ name: "category", value: message.tag.replace(/[^\w-]/g, "_") }] } : {}),
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        return { ok: false, provider: "resend", ...classifyNetworkError(err) };
      }

      const body = (await res.json().catch(() => ({}))) as { id?: string; name?: string; statusCode?: number };
      if (res.ok) return { ok: true, provider: "resend", providerMessageId: body.id };

      // Resend reports an unverified sender domain as 403 validation_error, and
      // a reused idempotency key with a different body as 409.
      let failure = classifyHttpStatus(res.status);
      if (res.status === 409) failure = "unknown";
      return { ok: false, provider: "resend", failure, httpStatus: res.status, errorCode: String(body.name ?? res.status).slice(0, 64) };
    },
  };
}
