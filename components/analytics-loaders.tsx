"use client";

import Script from "next/script";
import { useConsent } from "./consent-context";
import {
  GA_MEASUREMENT_ID,
  CLARITY_PROJECT_ID,
} from "@/lib/analytics";

// GA4 and Clarity scripts. Rendered only when consent is granted, so no
// tracking cookies are set for visitors who reject or haven't chosen yet.
export default function AnalyticsLoaders() {
  const { consent } = useConsent();
  if (consent !== "granted") return null;

  return (
    <>
      {GA_MEASUREMENT_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            `}
          </Script>
        </>
      )}

      {CLARITY_PROJECT_ID && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_PROJECT_ID}");
          `}
        </Script>
      )}
    </>
  );
}