// Google Analytics 4 + Microsoft Clarity. Both are public client-side IDs
// (they ship in the browser), baked in (env-overridable) so a deploy needs no
// dashboard env step. Both are loaded ONLY after the user accepts analytics
// cookies — see components/consent-context.tsx and analytics-loaders.tsx.
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_ID ?? "G-G1CZ0T8NC0";
export const CLARITY_PROJECT_ID =
  process.env.NEXT_PUBLIC_CLARITY_ID ?? "xk97dro1vg";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Send a product event to GA4. A no-op until GA has loaded (i.e. until the user
// has accepted analytics cookies), so pre-consent calls are safely dropped.
// GA4-side configuration (marking as conversions, custom dimensions, reports)
// is done in the GA dashboard.
export function trackEvent(
  name: string,
  props?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, props);
}