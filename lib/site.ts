// Brand and origin, shared by the layout metadata, robots, sitemap and the
// generated icon so they never drift apart. footylinks is one site under the
// sixdegrees engine; the channel brand is sixdegreesgaming.
export const SITE_NAME = "footylinks";
export const SITE_DESCRIPTION =
  "Connect two footballers through the clubs they shared.";

// The registered canonical domain. Hardcoded now that it exists (previously we
// deferred this until the domain was live). An explicit env override still wins.
export const SITE_URL = "https://footylinks.app";

// Resolve the site origin. Order: an explicit override, then the canonical
// domain in production, then a preview deployment's own generated URL, then
// localhost in dev.
export function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_ENV === "production") {
    return SITE_URL;
  }
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;
  if (host) return `https://${host}`;
  return "http://localhost:3000";
}
