import type { Metadata } from "next";
import LivePlayer from "../components/LivePlayer";
import ShareButton from "./ShareButton";
import SocialLinksGrid from "../components/SocialLinksGrid";
import { resolveLiveSource } from "@/lib/live-stream";
import { buildLiveBroadcastJsonLd } from "@/lib/live-schema";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import { getWpApiBase } from "@/lib/wp-config";

/** Direct : jamais de page HTML mise en cache côté CDN / reverse proxy applicatif. */
export const dynamic = "force-dynamic";

type LivePost = {
  id: number;
  acf?: {
    player?: string;
    lien_live?: string;
    satut_live?: string;
  };
};

async function getLive(): Promise<LivePost | null> {
  const res = await fetch(`${getWpApiBase()}/live`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Impossible de récupérer le live");
  }

  const data: LivePost[] = await res.json();
  return data.length > 0 ? data[0] : null;
}

const LIVE_TITLE = "Direct en continu | L'Intelligent TV";
const LIVE_DESCRIPTION =
  "Regardez L'Intelligent TV en direct : diffusion 24h/24, émissions d'actualité et rendez-vous info en streaming.";

export const metadata: Metadata = {
  title: LIVE_TITLE,
  description: LIVE_DESCRIPTION,
  alternates: {
    canonical: "/live",
  },
  openGraph: {
    title: LIVE_TITLE,
    description: LIVE_DESCRIPTION,
    url: `${SITE_ORIGIN}/live`,
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: LIVE_TITLE,
    description: LIVE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default async function LivePage() {
  const live = await getLive();
  const statut = live?.acf?.satut_live;
  const isOnAir = statut === "en_direct";

  const liveSrc = resolveLiveSource({
    acfPlayer: live?.acf?.player,
    acfLiveLink: live?.acf?.lien_live,
  });

  const broadcastJsonLd = buildLiveBroadcastJsonLd(isOnAir);

  return (
    <>
      {broadcastJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(broadcastJsonLd) }}
        />
      )}
      <main className="relative min-h-screen overflow-hidden text-white">
        <div className="absolute inset-0">
          <img
            src="/bg-live.jpg"
            alt="Fond live"
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,12,24,0.58)_0%,rgba(8,12,24,0.44)_45%,rgba(8,12,24,0.68)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.16),transparent_30%)]" />

        <section className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 sm:pb-12 sm:pt-20 lg:px-8 lg:pb-14 lg:pt-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center rounded-full border border-red-500/30 bg-red-600/15 px-4 py-2 text-[0.72rem] font-extrabold uppercase tracking-[0.22em] text-red-300">
              En direct
            </div>

            <h1 className="mt-5 max-w-3xl text-[clamp(1.8rem,4vw,3.6rem)] font-extrabold leading-[0.96] tracking-tight text-white">
              Regardez L&apos;Intelligent TV
              <span className="block text-white/78">en direct</span>
            </h1>

            <p className="mt-5 max-w-3xl text-[1rem] leading-7 text-white/72 sm:text-[1.08rem] sm:leading-8">
              Suivez notre diffusion en continu, nos émissions, nos rendez-vous
              d’actualité et nos contenus en temps réel sur tous vos écrans.
            </p>
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-7xl px-4 pb-10 sm:px-6 sm:pb-14 lg:px-8">
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_320px] lg:gap-8">
            <div className="min-w-0">
              {isOnAir ? (
                <LivePlayer src={liveSrc} />
              ) : (
                <div className="rounded-[28px] border border-white/10 bg-black/25 px-6 py-8 text-center backdrop-blur-sm">
                  <p className="mb-3 text-xl font-semibold sm:text-2xl">
                    Le direct est actuellement hors ligne
                  </p>
                  <p className="text-sm text-white/60 sm:text-base">
                    Revenez plus tard pour suivre notre programmation en direct.
                  </p>
                </div>
              )}
            </div>

            <aside className="self-center rounded-[28px] border border-white/10 bg-black/22 p-5 shadow-xl backdrop-blur-md sm:p-6">
              <h2 className="mb-3 text-2xl font-extrabold leading-tight sm:text-[2rem]">
                Vous regardez actuellement L&apos;Intelligent TV
              </h2>

              <p className="mb-1 text-base font-medium text-white/85 sm:text-lg">
                Diffusion en continu 24h/24 et 7j/7
              </p>

              <p className="mb-5 text-sm leading-6 text-white/65 sm:text-base">
                Suivez-nous sur nos réseaux sociaux pour ne rien manquer.
              </p>

              <div className="mb-5">
                <SocialLinksGrid />
              </div>

              <ShareButton />
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
