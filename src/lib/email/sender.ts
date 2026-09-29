export type Sender = { email: string; name?: string };

/**
 * Reads the sending identity. EMAIL_FROM may be a bare address or the older
 * "Name <address>" form; EMAIL_FROM_NAME, when set, wins for the name.
 */
export function parseSender(from: string | undefined, name?: string): Sender | null {
  const raw = (from ?? "").trim();
  if (!raw) return null;
  const m = raw.match(/^(.*)<([^<>\s]+@[^<>\s]+)>$/);
  const email = (m ? m[2] : raw).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const parsedName = m ? m[1].trim().replace(/^"|"$/g, "") : "";
  const finalName = (name ?? "").trim() || parsedName || undefined;
  return { email, name: finalName };
}

/** RFC 5322 "Name <address>" for APIs that take a single string. */
export function formatSender({ email, name }: Sender): string {
  if (!name) return email;
  const safe = /^[\w .'-]+$/.test(name) ? name : `"${name.replace(/["\\]/g, "")}"`;
  return `${safe} <${email}>`;
}
