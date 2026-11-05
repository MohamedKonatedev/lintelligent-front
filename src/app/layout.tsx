import "./globals.css";
import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import SiteBottomTrail from "./components/SiteBottomTrail";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_ORIGIN } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: SITE_NAME,
  description:
    "L'Intelligent TV est une chaîne d’information en continu disponible 24h/24. Suivez le direct, les replays et nos programmes.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "L'Intelligent TV",
    description:
      "Suivez l'actualité en direct, les replays et nos programmes sur L'Intelligent TV.",
    url: SITE_ORIGIN,
    siteName: SITE_NAME,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "L'Intelligent TV",
    description:
      "Suivez l'actualité en direct, les replays et nos programmes sur L'Intelligent TV.",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <body className="bg-[#050816] text-white">
        <SiteHeader />
        {children}
        <SiteBottomTrail />
        <SiteFooter />
        <GoogleAnalytics gaId="G-VMFF3F5Z3F" />
      </body>
    </html>
  );
}