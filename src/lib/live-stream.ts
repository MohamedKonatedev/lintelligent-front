/** Player iframe Get Stream Hosting (fallback si pas de HLS). */
export const FALLBACK_PLAYER_URL =
  "https://video1.getstreamhosting.com:2000/VideoPlayer/8074?autoplay=1";

/** Flux HLS direct (préféré pour un démarrage fluide). */
export const FALLBACK_HLS_URL =
  "https://video1.getstreamhosting.com:1936/8074/8074/playlist.m3u8";

export const ENV_LIVE_HLS_URL = process.env.NEXT_PUBLIC_LIVE_HLS_URL?.trim() || "";

function isDeprecatedProviderUrl(url: string): boolean {
  const s = url.toLowerCase();
  return s.includes("infomaniak.com") || s.includes("vedge.infomaniak");
}

export function isLikelyStreamUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const s = url.trim().toLowerCase();
  if (!s) return false;
  return (
    s.includes(".m3u8") ||
    s.includes("manifest") ||
    s.includes("/livecast/") ||
    s.includes("playlist.m3u8") ||
    s.includes("application/vnd.apple.mpegurl")
  );
}

export function resolveLiveSource(input: {
  acfPlayer?: string;
  acfLiveLink?: string;
}): string {
  const player = input.acfPlayer?.trim() || "";
  const link = input.acfLiveLink?.trim() || "";

  // Ignorer d’anciennes URLs Infomaniak éventuellement encore dans le CMS.
  if (isLikelyStreamUrl(player) && !isDeprecatedProviderUrl(player)) return player;
  if (isLikelyStreamUrl(link) && !isDeprecatedProviderUrl(link)) return link;
  if (ENV_LIVE_HLS_URL) return ENV_LIVE_HLS_URL;
  if (FALLBACK_HLS_URL) return FALLBACK_HLS_URL;
  if (link && !isDeprecatedProviderUrl(link)) return link;
  if (player && !isDeprecatedProviderUrl(player)) return player;
  return FALLBACK_PLAYER_URL;
}
