import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Image from "next/image";
import LivePlayer from "./components/LivePlayer";
import { PROGRAMS } from "./programmes/programs";
import { ENV_LIVE_HLS_URL, FALLBACK_HLS_URL, FALLBACK_PLAYER_URL } from "@/lib/live-stream";
import { buildHomeJsonLd } from "@/lib/json-ld-home";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import {
  IMAGE_QUALITY,
  PROGRAM_HOME_SQUARE_SIZES,
} from "@/lib/image-defaults";

const HomeHeroSlider = dynamic(() => import("./components/HomeHeroSlider"), {
  loading: () => (
    <div
      className="w-full bg-[#101722]"
      style={{ aspectRatio: "16 / 9" }}
      aria-hidden
    />
  ),
});

/** ISR : contenu éditorial rafraîchi sans cache HTML d’un an. */
export const revalidate = 600;

const HOME_TITLE =
  "L'Intelligent TV – Info en direct, replays et émissions | Côte d'Ivoire";

const HOME_DESCRIPTION =
  "Suivez L'Intelligent TV en direct 24h/24 : actualité, débats, entretiens et replays de nos émissions. Web TV ivoirienne accessible sur mobile et ordinateur.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: SITE_ORIGIN,
    siteName: SITE_NAME,
    locale: "fr_FR",
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

const emissions = PROGRAMS.map((p) => ({
  title: p.title,
  href: p.href,
  image: `/programs/${p.slug}-home-square.jpg`,
  accent: p.accent,
}));

export default function HomePage() {
  const liveSrc = ENV_LIVE_HLS_URL || FALLBACK_HLS_URL || FALLBACK_PLAYER_URL;
  const jsonLdBlocks = buildHomeJsonLd();

  return (
    <>
      {jsonLdBlocks.map((block) => (
        <script
          key={String(block["@type"])}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <main className="min-h-screen bg-[#101722] text-[#f3f6fb]">
        <section className="mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28">
          <h1 className="sr-only">
            L&apos;Intelligent TV — information en direct, replays et émissions
          </h1>

          <div className="mb-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              En direct
            </h2>
          </div>

          <LivePlayer src={liveSrc} deferStreamLoad />
        </section>

        <HomeHeroSlider />

        <section className="mx-auto max-w-7xl px-4 py-14 pb-16 sm:px-6">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Nos émissions
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {emissions.map((item) => (
              <a
                key={item.title}
                href={item.href}
                className="group overflow-hidden rounded-[26px] bg-[#182130] shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1"
              >
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes={PROGRAM_HOME_SQUARE_SIZES}
                    quality={IMAGE_QUALITY}
                    loading="lazy"
                    className="object-cover transition duration-500 group-hover:scale-105 group-hover:grayscale"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-1 z-[1]"
                    style={{ backgroundColor: item.accent }}
                  />
                </div>

                <div className="p-5">
                  <h3 className="text-xl font-bold text-white">{item.title}</h3>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
