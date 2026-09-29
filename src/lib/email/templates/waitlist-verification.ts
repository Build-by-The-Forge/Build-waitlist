import type { EmailMessage } from "../types";

export type WaitlistVerificationInput = {
  to: string;
  verifyUrl: string;
  siteUrl: string;
  ttlHours: number;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function expiryPhrase(hours: number) {
  return hours % 24 === 0 && hours >= 48 ? `${hours / 24} days` : `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/**
 * "Confirm your email" message. The button and the written-out link point to
 * the exact same URL: the button for most people, the plain link for clients
 * that strip styling or block buttons.
 *
 * Table layout with inline styles because that's what email clients render
 * consistently (no external CSS, no web fonts required).
 */
export function waitlistVerificationEmail({ to, verifyUrl, siteUrl, ttlHours }: WaitlistVerificationInput): EmailMessage {
  const url = escapeHtml(verifyUrl);
  const site = escapeHtml(siteUrl);
  const siteHost = escapeHtml(new URL(siteUrl).host);
  const expires = expiryPhrase(ttlHours);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Confirm your email for BUILD</title>
</head>
<body style="margin:0;padding:0;background:#f6f5f1;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Confirm your email to join the BUILD waitlist.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f1;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr>
          <td style="padding:0 8px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:8px;background:#0f1013;color:#e8572a;text-align:center;font-size:15px;vertical-align:middle;">&#10022;</span>
            <span style="font-size:17px;font-weight:700;letter-spacing:2px;color:#0f1013;vertical-align:middle;padding-left:8px;">BUILD</span>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid #e8e5de;border-radius:20px;padding:36px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f1013;">
            <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.5px;">You&rsquo;re almost in.</h1>
            <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#45464d;">Confirm your email to join the BUILD waitlist.</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:999px;background:#0f1013;">
                  <a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#fafaf7;text-decoration:none;border-radius:999px;">Verify my email &rarr;</a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 8px;font-size:14px;line-height:1.6;color:#45464d;">Or copy and paste this link into your browser:</p>
            <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${url}" target="_blank" style="color:#b93f14;">${url}</a></p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#6a6b73;">This link expires in ${expires}. If you didn&rsquo;t request this, you can safely ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6a6b73;">
            Sent to ${escapeHtml(to)} because this address was entered on the BUILD waitlist at <a href="${site}" style="color:#6a6b73;">${siteHost}</a>.<br>
            <a href="${site}/privacy" style="color:#6a6b73;">Privacy</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    "BUILD",
    "",
    "You're almost in.",
    "",
    "Confirm your email to join the BUILD waitlist:",
    verifyUrl,
    "",
    `This link expires in ${expires}. If you didn't request this, you can safely ignore this email.`,
    "",
    `Sent to ${to} because this address was entered on the BUILD waitlist at ${new URL(siteUrl).host}.`,
    `Privacy: ${siteUrl}/privacy`,
  ].join("\n");

  return { to, subject: "Confirm your email for the BUILD waitlist", html, text };
}
