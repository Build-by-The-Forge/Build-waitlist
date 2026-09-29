/**
 * Provider-agnostic analytics. Events go to `window.dataLayer` (GTM-compatible)
 * and to Plausible or PostHog if either script is present on the page.
 * No provider is bundled; add one in layout.tsx once a vendor is chosen.
 */
export type AnalyticsEvent =
  | "page_view"
  | "hero_cta_click"
  | "product_demo_view"
  | "waitlist_form_focus"
  | "waitlist_submit"
  | "waitlist_duplicate"
  | "waitlist_error"
  | "waitlist_verification_requested"
  | "waitlist_verification_resend"
  | "waitlist_verification_completed"
  | "waitlist_verification_failed";

type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    plausible?: (event: string, options?: { props?: Props }) => void;
    posthog?: { capture: (event: string, props?: Props) => void };
  }
}

export function track(event: AnalyticsEvent, props: Props = {}) {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event, ...props });
    window.plausible?.(event, { props });
    window.posthog?.capture(event, props);
    if (process.env.NODE_ENV === "development") console.debug("[analytics]", event, props);
  } catch {
    // Analytics must never break the page.
  }
}
