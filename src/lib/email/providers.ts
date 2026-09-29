import { EmailDeliveryError, type EmailMessage, type EmailProvider } from "./types";

type ResendConfig = { apiKey: string; from: string; replyTo?: string; fetch?: typeof fetch };

/** Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email). No SDK needed. */
export function resendProvider({ apiKey, from, replyTo, fetch: fetchImpl = fetch }: ResendConfig): EmailProvider {
  return {
    name: "resend",
    async send(message: EmailMessage) {
      let res: Response;
      try {
        res = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
            ...(replyTo ? { reply_to: replyTo } : {}),
          }),
          signal: AbortSignal.timeout(10_000),
        });
      } catch (err) {
        throw new EmailDeliveryError(`resend request failed: ${err instanceof Error ? err.name : "unknown"}`);
      }
      if (!res.ok) {
        // Resend's error body names the problem (e.g. unverified domain) without echoing the key.
        const detail = await res
          .json()
          .then((b: { name?: string; message?: string }) => b?.name ?? b?.message ?? "")
          .catch(() => "");
        throw new EmailDeliveryError(`resend responded ${res.status}${detail ? ` (${String(detail).slice(0, 120)})` : ""}`, res.status);
      }
      const body = (await res.json().catch(() => ({}))) as { id?: string };
      return { id: body.id };
    },
  };
}

/** Development: prints the email (including the verification link) to the server log. */
export function consoleProvider(log: (line: string) => void = console.info): EmailProvider {
  return {
    name: "console",
    async send(message: EmailMessage) {
      log(`[email:console] to=${message.to} subject="${message.subject}"\n${message.text}`);
      return {};
    },
  };
}

/** Tests: keeps sent messages in memory. */
export function memoryProvider(): EmailProvider & { sent: EmailMessage[]; failNext: boolean } {
  const provider = {
    name: "memory",
    sent: [] as EmailMessage[],
    failNext: false,
    async send(message: EmailMessage) {
      if (provider.failNext) {
        provider.failNext = false;
        throw new EmailDeliveryError("memory provider: simulated failure", 500);
      }
      provider.sent.push(message);
      return { id: `mem_${provider.sent.length}` };
    },
  };
  return provider;
}
