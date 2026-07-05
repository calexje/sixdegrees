"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { POSTHOG_KEY, POSTHOG_HOST } from "@/lib/analytics";

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // Cookieless: no cookies or localStorage, so no consent banner is needed.
      // The trade-off is no cross-session identity (a returning player looks new),
      // which is fine for the within-session funnels we care about. Flip this to a
      // persistent mode once the AdSense consent banner is live.
      persistence: "memory",
      capture_pageview: true,
      capture_pageleave: true,
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
