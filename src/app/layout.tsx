import type { Metadata } from "next";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/400-italic.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./globals.css";
import { LangProvider } from "@/i18n";
import { PosthogProvider } from "../components/PosthogProvider";

const SITE = "https://dinesafe.canada.nshipyard.com";

export const metadata: Metadata = {
  title: "DineSafe Report Card: which chains fail food-safety inspections most often",
  description:
    "84 Toronto restaurant and food chains ranked by conditional-pass rate, from 32,421 Toronto Public Health inspections (Oct 2025 - Oct 2026). Rates normalized per inspection. Open data, MIT licensed.",
  metadataBase: new URL(SITE),
  openGraph: {
    title: "DineSafe Report Card: which chains fail food-safety inspections most often",
    description:
      "84 Toronto chains ranked by conditional-pass rate, from 32,421 Toronto Public Health inspections. A conditional pass is fixed within 48 hours, not an ongoing hazard.",
    url: SITE,
    siteName: "Open Nshipyard",
    images: [{ url: "/og-card.png", width: 1200, height: 630, alt: "DineSafe Report Card" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DineSafe Report Card: which chains fail food-safety inspections most often",
    description:
      "84 Toronto chains ranked by conditional-pass rate, from 32,421 Toronto Public Health inspections. Open data.",
    images: ["/og-card.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      "/favicon.ico",
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col"><PosthogProvider>
        <LangProvider>{children}</LangProvider>
      </PosthogProvider></body>
    </html>
  );
}
