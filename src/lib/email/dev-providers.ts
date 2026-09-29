import type { EmailMessage, EmailProvider, EmailSendResult, FailureClass } from "./types";

/** Development only: prints the email (including the verification link) to the server log. */
export function consoleProvider(log: (line: string) => void = console.info): EmailProvider {
  return {
    name: "console",
    async send(message: EmailMessage): Promise<EmailSendResult> {
      log(`[email:console] to=${message.to} subject="${message.subject}"\n${message.text}`);
      return { ok: true, provider: "console" };
    },
  };
}

/** Tests: keeps sent messages in memory and can be told to fail. */
export function memoryProvider(name: EmailProvider["name"] = "memory") {
  const provider = {
    name,
    sent: [] as (EmailMessage & { idempotencyKey?: string })[],
    /** Fail the next send with this class, then go back to succeeding. */
    failNext: null as FailureClass | null,
    /** Fail every send with this class until cleared. */
    failAll: null as FailureClass | null,
    async send(message: EmailMessage, options: { idempotencyKey?: string } = {}): Promise<EmailSendResult> {
      const failure = provider.failNext ?? provider.failAll;
      provider.failNext = null;
      if (failure) return { ok: false, provider: name, failure, errorCode: "simulated" };
      provider.sent.push({ ...message, idempotencyKey: options.idempotencyKey });
      return { ok: true, provider: name, providerMessageId: `${name}_${provider.sent.length}` };
    },
  };
  return provider satisfies EmailProvider;
}
