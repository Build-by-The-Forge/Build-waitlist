export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Short tag for provider dashboards, e.g. "waitlist-verification". */
  tag?: string;
};

export type ProviderName = "brevo" | "resend" | "console" | "memory";

/**
 * Why a send failed, which decides whether another provider may be tried:
 *
 * - transient     the provider certainly did NOT accept the message (connection
 *                 refused, DNS failure, 429, 502/503). Safe to try the fallback.
 * - unknown       the request may have been accepted (timeout or connection drop
 *                 after sending, 504). Trying another provider risks a duplicate.
 * - permanent     the provider rejected this message (bad recipient, malformed
 *                 request). Another provider would most likely reject it too.
 * - configuration our setup is wrong (missing/invalid key, unverified sender).
 */
export type FailureClass = "transient" | "unknown" | "permanent" | "configuration";

export type EmailSendResult =
  | { ok: true; provider: ProviderName; providerMessageId?: string }
  | { ok: false; provider: ProviderName; failure: FailureClass; errorCode?: string; httpStatus?: number };

export type SendOptions = {
  /** Stable id for this logical email; providers that support it use it to deduplicate retries. */
  idempotencyKey?: string;
};

/** Every provider adapter implements this. Adapters never throw; failures come back classified. */
export interface EmailProvider {
  readonly name: ProviderName;
  send(message: EmailMessage, options?: SendOptions): Promise<EmailSendResult>;
}

export class EmailNotConfiguredError extends Error {
  constructor(detail: string) {
    super(`Email delivery is not configured: ${detail}`);
    this.name = "EmailNotConfiguredError";
  }
}
