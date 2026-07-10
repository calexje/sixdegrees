"use client";

import Link from "next/link";
import { useConsent } from "./consent-context";

export default function ConsentBanner() {
  const { bannerOpen, accept, reject } = useConsent();
  if (!bannerOpen) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur">
      <div className="max-w-xl lg:max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
        <p className="text-muted flex-1">
          We use cookies for analytics (Google Analytics
          and Microsoft Clarity) to see how the game is
          played and improve it. Nothing loads until you
          accept. See our{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={reject}
            className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-100 dark:hover:bg-surface-800 transition"
          >
            Reject
          </button>
          <button
            onClick={accept}
            className="px-3 py-1.5 rounded-lg bg-primary-500 text-black font-semibold hover:bg-primary-600 transition"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}