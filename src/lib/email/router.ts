import type { EmailMessage, EmailProvider, EmailSendResult, FailureClass, ProviderName, SendOptions } from "./types";

export type DeliveryAttempt = {
  provider: ProviderName;
  ok: boolean;
  failure?: FailureClass;
  providerMessageId?: string;
  errorCode?: string;
};

export type RoutedResult = EmailSendResult & { attempts: DeliveryAttempt[] };

export interface EmailRouter extends EmailProvider {
  send(message: EmailMessage, options?: SendOptions): Promise<RoutedResult>;
}

/**
 * Only a failure where the primary provably did NOT accept the message may
 * go to the fallback. "unknown" might already be delivered (duplicate risk),
 * and "permanent"/"configuration" would fail again or hide the real problem.
 */
export const shouldFallback = (failure: FailureClass) => failure === "transient";

type Log = (fields: Record<string, string | number | boolean>) => void;
const defaultLog: Log = (fields) => console.info(JSON.stringify({ event: "email_attempt", ...fields }));

/**
 * Primary/fallback routing. Not round-robin: the primary carries all normal
 * traffic and the fallback exists for resilience. Both receive the same
 * logical message and idempotency key. Logs carry no addresses, tokens or URLs.
 */
export function createEmailRouter({ primary, fallback, log = defaultLog }: { primary: EmailProvider; fallback?: EmailProvider; log?: Log }): EmailRouter {
  const attempt = async (provider: EmailProvider, message: EmailMessage, options: SendOptions): Promise<EmailSendResult> =>
    provider.send(message, options).catch(() => ({ ok: false as const, provider: provider.name, failure: "unknown" as const, errorCode: "adapter_threw" }));

  const record = (r: EmailSendResult): DeliveryAttempt =>
    r.ok
      ? { provider: r.provider, ok: true, providerMessageId: r.providerMessageId }
      : { provider: r.provider, ok: false, failure: r.failure, errorCode: r.errorCode };

  return {
    name: primary.name,
    async send(message, options = {}) {
      const category = message.tag ?? "email";
      const first = await attempt(primary, message, options);
      const attempts = [record(first)];
      const willFallback = !first.ok && Boolean(fallback) && shouldFallback(first.failure);
      log({
        category,
        provider: first.provider,
        result: first.ok ? "success" : "failure",
        ...(first.ok ? {} : { failure_class: first.failure, error_code: first.errorCode ?? "" }),
        ...(willFallback ? { fallback: fallback!.name } : {}),
      });
      if (first.ok || !willFallback) return { ...first, attempts };

      const second = await attempt(fallback!, message, options);
      attempts.push(record(second));
      log({
        category,
        provider: second.provider,
        result: second.ok ? "success" : "failure",
        is_fallback: true,
        ...(second.ok ? {} : { failure_class: second.failure, error_code: second.errorCode ?? "" }),
      });
      return { ...second, attempts };
    },
  };
}
