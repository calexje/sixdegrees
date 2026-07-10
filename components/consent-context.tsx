"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type Consent = "granted" | "denied" | null;

const KEY = "footylinks:cookieConsent";

type ConsentValue = {
  consent: Consent;
  bannerOpen: boolean;
  accept: () => void;
  reject: () => void;
  reopen: () => void;
};

const ConsentContext = createContext<ConsentValue>({
  consent: null,
  bannerOpen: false,
  accept: () => {},
  reject: () => {},
  reopen: () => {},
});

export function ConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [consent, setConsent] = useState<Consent>(null);
  const [bannerOpen, setBannerOpen] = useState(false);

  // Read the stored choice on mount. No stored choice => show the banner. This
  // runs client-side only, so nothing tracking-related happens during SSR.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(KEY);
      if (stored === "granted" || stored === "denied") {
        setConsent(stored);
      } else {
        setBannerOpen(true);
      }
    } catch {
      setBannerOpen(true);
    }
  }, []);

  function choose(value: "granted" | "denied") {
    setConsent(value);
    setBannerOpen(false);
    try {
      window.localStorage.setItem(KEY, value);
    } catch {
      // ignore (private mode / disabled storage)
    }
  }

  return (
    <ConsentContext.Provider
      value={{
        consent,
        bannerOpen,
        accept: () => choose("granted"),
        reject: () => choose("denied"),
        reopen: () => setBannerOpen(true),
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  return useContext(ConsentContext);
}