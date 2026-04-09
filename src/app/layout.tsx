import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import SiteBottomTrail from "./components/SiteBottomTrail";

export const metadata: Metadata = {
  metadataBase: new URL("https://lintelligent.tv"),
  title: "L'Intelligent TV",
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
    url: "https://lintelligent.tv",
    siteName: "L'Intelligent TV",
    images: [
      {
        url: "/og-image.jpeg",
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
    images: ["/og-image.jpeg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <head>
        <link
          rel="preload"
          as="image"
          href="/programs/les-entretiens-hero-mobile.jpg"
          media="(max-width: 767px)"
        />
        <link
          rel="preload"
          as="image"
          href="/programs/les-entretiens-hero-desktop.jpg"
          media="(min-width: 768px)"
        />
        <link rel="preload" as="image" href="/programs/les-entretiens-logo.png" />
      </head>
      <body className="bg-[#050816] text-white">
        <SiteHeader />
        {children}
        <SiteBottomTrail />
        <SiteFooter />
      </body>
    </html>
  );
}