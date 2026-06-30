import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/site";

// The game modes are query params on "/", so the only distinct URLs are the
// home board and the two content pages.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveSiteUrl();
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    {
      url: `${base}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/privacy`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
