import { SITE_NAME, SITE_ORIGIN, absoluteUrl } from "@/lib/site";

/** JSON-LD pour la page direct — flux continu sans dates inventées. */
export function buildLiveBroadcastJsonLd(isOnAir: boolean): Record<string, unknown> | null {
  if (!isOnAir) return null;

  const pageUrl = absoluteUrl("/live");

  return {
    "@context": "https://schema.org",
    "@type": "BroadcastEvent",
    name: `${SITE_NAME} — diffusion en direct`,
    isLiveBroadcast: true,
    videoFormat: "HD",
    url: pageUrl,
    publishedOn: {
      "@type": "BroadcastService",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
    workPerformed: {
      "@type": "CreativeWork",
      name: `${SITE_NAME} — live 24h/24`,
      url: pageUrl,
    },
  };
}
