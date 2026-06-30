import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { NavProvider } from "@/components/nav-context";
import Content from "@/components/content";
import { Analytics } from "@vercel/analytics/react";
import {
  SITE_NAME,
  SITE_DESCRIPTION,
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
        <Analytics />
      </body>
    </html>
  );
}
