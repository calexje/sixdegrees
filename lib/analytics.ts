import posthog from "posthog-js";

// PostHog project key + host. These are public client-side values (the key ships
// in the browser bundle by design), so baking them in is safe and means a deploy
// works without setting Vercel env vars. An env var still overrides if present.
export const POSTHOG_KEY =
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ??
  "phc_vNkeeE5Bmuvg4ohxgG6boKCVQvPQjxitdvGYtRYhoC9f";
export const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ??
  "https://eu.i.posthog.com";

// Fire a product event. Thin wrapper so the analytics provider stays swappable
// and calls are no-ops (rather than throwing) if PostHog isn't ready.
export function trackEvent(
  name: string,
  props?: Record<string, unknown>
) {
  try {
    posthog.capture(name, props);
  } catch {
    // ignore
  }
}
