import { consoleProvider, resendProvider } from "./providers";
import { EmailNotConfiguredError, type EmailProvider } from "./types";

export { EmailDeliveryError, EmailNotConfiguredError, type EmailMessage, type EmailProvider } from "./types";

type Env = Record<string, string | undefined>;

/**
 * Picks the transactional email provider from the environment.
 *
 *   EMAIL_PROVIDER=resend   EMAIL_API_KEY, EMAIL_FROM, optional EMAIL_REPLY_TO
 *   EMAIL_PROVIDER=console  development only: links are printed to the server log
 *
 * Unset: console in development; in production this throws, so signups fail
 * loudly instead of silently never sending verification emails.
 */
export function createEmailProvider(env: Env = process.env): EmailProvider {
  const provider = (env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  const production = env.NODE_ENV === "production";

  if (provider === "resend") {
    if (!env.EMAIL_API_KEY) throw new EmailNotConfiguredError("EMAIL_API_KEY is missing");
    if (!env.EMAIL_FROM) throw new EmailNotConfiguredError("EMAIL_FROM is missing");
    return resendProvider({ apiKey: env.EMAIL_API_KEY, from: env.EMAIL_FROM, replyTo: env.EMAIL_REPLY_TO || undefined });
  }
  if (provider === "console" || (!provider && !production)) {
    if (production) throw new EmailNotConfiguredError("the console provider is not allowed in production");
    return consoleProvider();
  }
  throw new EmailNotConfiguredError(provider ? `unknown EMAIL_PROVIDER "${provider}"` : "EMAIL_PROVIDER is not set");
}

let cached: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  return (cached ??= createEmailProvider());
}
