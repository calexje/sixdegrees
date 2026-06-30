import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/site";

// Everything here is public; just point crawlers at the sitemap.
export default function robots(): MetadataRoute.Robots {
  const base = resolveSiteUrl();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${base}/sitemap.xml`,
  };
}
