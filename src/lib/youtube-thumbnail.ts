/**
 * Extracts a YouTube video ID from common URL formats.
 */
export function extractYoutubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  const patterns = [
    /youtube\.com\/watch\?v=([^&?#]+)/,
    /youtu\.be\/([^?&#]+)/,
    /youtube\.com\/embed\/([^?&#]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Returns the hqdefault thumbnail URL for a YouTube video URL, or null if no ID can be parsed.
 */
export function getYoutubeThumbnail(url: string | null | undefined): string | null {
  const id = extractYoutubeVideoId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/** ACF field names used across the site for the video URL. */
export function getVideoUrlFromPost(post: { acf?: Record<string, unknown> } | null | undefined): string {
  const acf = post?.acf ?? {};
  const candidates = [
    acf.lien_video,
    acf.video_url,
    acf.youtube_url,
    acf.url_video,
  ];
  for (const v of candidates) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}
