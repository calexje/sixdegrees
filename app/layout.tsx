import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { NavProvider } from "@/components/nav-context";
import Content from "@/components/content";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_NAME = "Football Degrees";
const DESCRIPTION =
  "Connect two footballers through the clubs they shared.";

// Set NEXT_PUBLIC_SITE_URL to the production origin so share links resolve
// absolute OG asset URLs; falls back to localhost in dev.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: SITE_NAME,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: DESCRIPTION,
  },
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
        <NavProvider>
          <Suspense>
            <Header />
          </Suspense>

          <main className="max-w-xl lg:max-w-4xl w-full mx-auto px-4 py-10">
            <Content>{children}</Content>
          </main>

          <Footer />
        </NavProvider>
      </body>
    </html>
  );
}
