"use client";

import { useConsent } from "./consent-context";

export default function CookiePreferencesButton() {
  const { reopen } = useConsent();
  return (
    <button onClick={reopen} className="hover:text-foreground">
      Cookie preferences
    </button>
  );
}