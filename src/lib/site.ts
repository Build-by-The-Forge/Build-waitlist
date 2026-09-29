type Env = Record<string, string | undefined>;

/**
 * The site's public origin, used for verification links, metadata, the
 * sitemap and the API origin allow-list.
 *
 *  1. NEXT_PUBLIC_SITE_URL when set (always set it in production).
 *  2. On Vercel, the URL Vercel provides: the production domain for
 *     production deployments, the deployment's own URL for previews. This
 *     keeps a first deploy (before you know your *.vercel.app URL) or a
 *     preview from ever emailing localhost links.
 *  3. http://localhost:3000 for plain local development.
 */
export function resolveSiteUrl(env: Env = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel =
    env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL
      ? env.VERCEL_PROJECT_PRODUCTION_URL
      : (env.VERCEL_BRANCH_URL ?? env.VERCEL_URL);
  const url = explicit || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}

export const site = {
  name: "BUILD",
  tagline: "Your learning journey, intelligently connected.",
  title: "BUILD — Your Learning Journey, Intelligently Connected",
  description:
    "BUILD is an intelligent learning platform connecting courses, learning materials, practice, progress, and community in one experience.",
  url: resolveSiteUrl(),
} as const;

export const navLinks = [
  { label: "Product", href: "#product" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "About", href: "#about" },
] as const;

/** id of the final CTA section; every "Join the Waitlist" button points here. */
export const WAITLIST_ANCHOR = "join";
