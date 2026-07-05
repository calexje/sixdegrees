import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { NavProvider } from "@/components/nav-context";
import PostHogProvider from "@/components/posthog-provider";
import Content from "@/components/content";
import { Analytics } from "@vercel/analytics/react";
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  ADSENSE_CLIENT_ID,
  resolveSiteUrl,
} from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(resolveSiteUrl()),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  // AdSense ownership verification (Google reads this during review). Only
  // emitted once the publisher ID is set.
  other: ADSENSE_CLIENT_ID
    ? { "google-adsense-account": ADSENSE_CLIENT_ID }
    : {},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PostHogProvider>
        <NavProvider>
          <Suspense>
            <Header />
          </Suspense>

          <main className="max-w-xl lg:max-w-4xl w-full mx-auto px-4 py-10">
            <Content>{children}</Content>
          </main>

          <Footer />
        </NavProvider>
        </PostHogProvider>
        <Analytics />
        {ADSENSE_CLIENT_ID && (
          <Script
            id="adsbygoogle-init"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  );
}
