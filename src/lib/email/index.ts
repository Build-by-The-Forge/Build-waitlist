import { brevoProvider } from "./brevo";
import { consoleProvider } from "./dev-providers";
import { resendProvider } from "./resend";
import { createEmailRouter, type EmailRouter } from "./router";
import { parseSender } from "./sender";
import { EmailNotConfiguredError, type EmailProvider, type EmailSendResult, type ProviderName } from "./types";

export { createEmailRouter, type DeliveryAttempt, type EmailRouter, type RoutedResult } from "./router";
export {
  EmailNotConfiguredError,
  type EmailMessage,
  type EmailProvider,
  type EmailSendResult,
  type FailureClass,
  type ProviderName,
} from "./types";

type Env = Record<string, string | undefined>;
type RealProvider = "brevo" | "resend";

const KEY_VAR: Record<RealProvider, string> = { brevo: "BREVO_API_KEY", resend: "RESEND_API_KEY" };

/** Stand-in for a provider whose settings are missing: every send fails as "configuration". */
function unconfigured(name: ProviderName, detail: string): EmailProvider {
  let logged = false;
  return {
    name,
    async send(): Promise<EmailSendResult> {
      if (!logged) {
        console.error(`[email] ${new EmailNotConfiguredError(detail).message}`);
        logged = true;
      }
      return { ok: false, provider: name, failure: "configuration", errorCode: "not_configured" };
    },
  };
}

function build(name: RealProvider, env: Env): EmailProvider {
  const apiKey = env[KEY_VAR[name]];
  const from = parseSender(env.EMAIL_FROM, env.EMAIL_FROM_NAME);
  if (!apiKey) return unconfigured(name, `${KEY_VAR[name]} is missing`);
  if (!from) return unconfigured(name, "EMAIL_FROM is missing or not an email address");
  const replyTo = env.EMAIL_REPLY_TO || undefined;
  return name === "brevo" ? brevoProvider({ apiKey, from, replyTo }) : resendProvider({ apiKey, from, replyTo });
}

const isReal = (p: string): p is RealProvider => p === "brevo" || p === "resend";

/**
 * Builds the email router from the environment.
 *
 *   EMAIL_PROVIDER           primary: brevo | resend | console (dev only)
 *   EMAIL_FALLBACK_PROVIDER  optional: brevo | resend | none. Defaults to the
 *                            other real provider when its API key is set.
 *   BREVO_API_KEY, RESEND_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME, EMAIL_REPLY_TO
 *
 * Canonical BUILD setup: EMAIL_PROVIDER=brevo with RESEND_API_KEY set, so
 * Brevo carries traffic and Resend is the fallback.
 *
 * Unset EMAIL_PROVIDER means console in development; in production it throws
 * so a deploy without email configuration fails loudly.
 */
export function createEmailRouterFromEnv(env: Env = process.env): EmailRouter {
  const primaryName = (env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  const production = env.NODE_ENV === "production";

  if (primaryName === "console" || (!primaryName && !production)) {
    if (production) throw new EmailNotConfiguredError("the console provider is not allowed in production");
    return createEmailRouter({ primary: consoleProvider() });
  }
  if (!primaryName) throw new EmailNotConfiguredError("EMAIL_PROVIDER is not set");
  if (!isReal(primaryName)) throw new EmailNotConfiguredError(`unknown EMAIL_PROVIDER "${primaryName}"`);

  const requested = (env.EMAIL_FALLBACK_PROVIDER ?? "").trim().toLowerCase();
  if (requested && requested !== "none" && !isReal(requested)) {
    throw new EmailNotConfiguredError(`unknown EMAIL_FALLBACK_PROVIDER "${requested}"`);
  }
  const other: RealProvider = primaryName === "brevo" ? "resend" : "brevo";
  const fallbackName: RealProvider | null =
    requested === "none" ? null : isReal(requested) ? requested : env[KEY_VAR[other]] ? other : null;
  if (fallbackName === primaryName) throw new EmailNotConfiguredError("EMAIL_FALLBACK_PROVIDER must differ from EMAIL_PROVIDER");

  return createEmailRouter({
    primary: build(primaryName, env),
    fallback: fallbackName ? build(fallbackName, env) : undefined,
  });
}

let cached: EmailRouter | undefined;

export function getEmailRouter(): EmailRouter {
  return (cached ??= createEmailRouterFromEnv());
}
