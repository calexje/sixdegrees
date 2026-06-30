// Brand and origin, shared by the layout metadata, robots, sitemap and the
// generated icon so they never drift apart. footylinks is one site under the
// sixdegrees engine; the channel brand is sixdegreesgaming.
export const SITE_NAME = "footylinks";
export const SITE_DESCRIPTION =
  "Connect two footballers through the clubs they shared.";

// Resolve the site origin without hardcoding it: an explicit override wins,
// otherwise Vercel's production-domain / deployment env vars (which point at the
// real domain once it's attached), falling back to localhost in dev.
export function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;
  if (host) return `https://${host}`;
  return "http://localhost:3000";
}
