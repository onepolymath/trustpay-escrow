import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { ProgramStatusBanner } from "@/components/program-status";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SITE_URL } from "@/lib/config";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TrustPay: escrow for Instagram & WhatsApp sellers",
    template: "%s · TrustPay",
  },
  description:
    "Pay social-media vendors without the fear of being scammed. Your money waits in a Solana escrow until you confirm delivery, and every vendor carries an on-chain reputation.",
  openGraph: {
    title: "TrustPay",
    description: "Buyer-protected payments for Instagram, WhatsApp and X vendors. On Solana.",
    type: "website",
    images: ["/api/og"],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfdfc" },
    { media: "(prefers-color-scheme: dark)", color: "#14161b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col font-sans">
        <Providers>
          <SiteHeader />
          <ProgramStatusBanner />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
