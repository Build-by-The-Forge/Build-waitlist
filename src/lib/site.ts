export const site = {
  name: "BUILD",
  tagline: "Your learning journey, intelligently connected.",
  title: "BUILD — Your Learning Journey, Intelligently Connected",
  description:
    "BUILD is an intelligent learning platform connecting courses, learning materials, practice, progress, and community in one experience.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
} as const;

export const navLinks = [
  { label: "Product", href: "#product" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "About", href: "#about" },
] as const;

/** id of the final CTA section; every "Join the Waitlist" button points here. */
export const WAITLIST_ANCHOR = "join";
