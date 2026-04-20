export const FALLBACK_PLAYER_URL =
  "https://player.infomaniak.com/?channel=XW99617043325684590&player=12754";
export const FALLBACK_HLS_URL =
  "https://edge15.vedge.infomaniak.com/livecast/ik:33dm09/manifest.m3u8";

export const ENV_LIVE_HLS_URL = process.env.NEXT_PUBLIC_LIVE_HLS_URL?.trim() || "";

export function isLikelyStreamUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const s = url.trim().toLowerCase();
  if (!s) return false;
  return (
    s.includes(".m3u8") ||
    s.includes("manifest") ||
    s.includes("/livecast/") ||
    s.includes("application/vnd.apple.mpegurl")
  );
}

export function resolveLiveSource(input: {
  acfPlayer?: string;
  acfLiveLink?: string;
}): string {
  const player = input.acfPlayer?.trim() || "";
  const link = input.acfLiveLink?.trim() || "";

  if (isLikelyStreamUrl(player)) return player;
  if (isLikelyStreamUrl(link)) return link;
  if (ENV_LIVE_HLS_URL) return ENV_LIVE_HLS_URL;
  if (FALLBACK_HLS_URL) return FALLBACK_HLS_URL;
  if (link) return link;
  if (player) return player;
  return FALLBACK_PLAYER_URL;
}
