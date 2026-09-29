import { consoleProvider } from "./dev-providers";
import { resendProvider } from "./resend";
import { parseSender } from "./sender";
import { EmailNotConfiguredError, type EmailProvider } from "./types";

export {
  EmailNotConfiguredError,
  type EmailMessage,
  type EmailProvider,
  type EmailSendResult,
  type FailureClass,
  type ProviderName,
} from "./types";

type Env = Record<string, string | undefined>;

/**
 * Picks the transactional email provider from the environment.
 *
 *   EMAIL_PROVIDER=resend   RESEND_API_KEY, EMAIL_FROM, optional EMAIL_FROM_NAME / EMAIL_REPLY_TO
 *   EMAIL_PROVIDER=console  development only: links are printed to the server log
 *
 * Unset: console in development; in production this throws, so signups fail
 * loudly instead of silently never sending verification emails.
 */
export function createEmailProvider(env: Env = process.env): EmailProvider {
  const provider = (env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  const production = env.NODE_ENV === "production";

  if (provider === "resend") {
    if (!env.RESEND_API_KEY) throw new EmailNotConfiguredError("RESEND_API_KEY is missing");
    const from = parseSender(env.EMAIL_FROM, env.EMAIL_FROM_NAME);
    if (!from) throw new EmailNotConfiguredError("EMAIL_FROM is missing or not an email address");
    return resendProvider({ apiKey: env.RESEND_API_KEY, from, replyTo: env.EMAIL_REPLY_TO || undefined });
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
