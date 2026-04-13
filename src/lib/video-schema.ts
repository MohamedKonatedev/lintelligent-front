import type { WpPost } from "@/lib/wordpress";
import { getReplayCardImage, stripHtml } from "@/lib/wordpress";
import { extractYoutubeVideoId } from "@/lib/youtube-thumbnail";

const SITE_ORIGIN = "https://lintelligent.tv";

/** Convertit une durée type « 16:09 » ou « 1:16:09 » en ISO 8601 (PT…) pour schema.org. */
export function parseDurationToIso8601(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  const parts = s.split(":").map((p) => Number.parseInt(p.trim(), 10));
  if (parts.length === 0 || parts.some((n) => Number.isNaN(n) || n < 0)) return undefined;

  let h = 0;
  let m = 0;
  let sec = 0;
  if (parts.length === 1) {
    sec = parts[0];
  } else if (parts.length === 2) {
    m = parts[0];
    sec = parts[1];
  } else {
    h = parts[0];
    m = parts[1];
    sec = parts[2];
  }

  let out = "PT";
  if (h > 0) out += `${h}H`;
  if (m > 0) out += `${m}M`;
  if (sec > 0 || out === "PT") out += `${sec}S`;
  return out;
}

function acfText(v: unknown): string {
  if (v == null || v === false) return "";
  return typeof v === "string" ? v.trim() : String(v).trim();
}

function pickDescriptionPlain(video: WpPost, acfShort: string | null): string {
  const parts = [
    acfShort && stripHtml(acfShort),
    video.excerpt?.rendered && stripHtml(video.excerpt.rendered),
    video.content?.rendered && stripHtml(video.content.rendered),
  ].filter(Boolean) as string[];
  const text = parts[0] || "";
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

function collectThumbnailUrls(video: WpPost, youtubeWatchUrl: string | null): string[] {
  const seen = new Set<string>();
  const add = (u: string | null | undefined) => {
    if (!u || !u.startsWith("http")) return;
    seen.add(u);
  };

  add(getReplayCardImage(video));

  const id = youtubeWatchUrl ? extractYoutubeVideoId(youtubeWatchUrl) : null;
  if (id) {
    add(`https://img.youtube.com/vi/${id}/maxresdefault.jpg`);
    add(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
  }

  return [...seen];
}

function toUploadDateIso(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/** JSON-LD VideoObject pour la page `/videos/[slug]`. */
export function buildVideoObjectJsonLd(input: {
  video: WpPost;
  slug: string;
  videoSourceUrl: string;
  /** Texte ou HTML court (ACF) ; sera nettoyé pour la description. */
  acfShortPlain: string | null;
}): Record<string, unknown> {
  const { video, slug, videoSourceUrl, acfShortPlain: acfShortRaw } = input;
  const pageUrl = `${SITE_ORIGIN}/videos/${slug}`;
  const title = stripHtml(video.title?.rendered || "Vidéo");

  const ytId = extractYoutubeVideoId(videoSourceUrl);
  const embedUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : undefined;
  const contentUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : undefined;

  const acf = (video.acf ?? {}) as Record<string, unknown>;
  const durationIso = parseDurationToIso8601(acfText(acf.duree));
  const uploadDate = toUploadDateIso(video.date);

  const thumbnails = collectThumbnailUrls(video, contentUrl || videoSourceUrl || null);
  const description = pickDescriptionPlain(video, acfShortRaw);

  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: title,
    description: description || title,
    url: pageUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "L'Intelligent TV",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/home/IAtv-logo.png`,
      },
    },
  };

  if (thumbnails.length === 1) {
    obj.thumbnailUrl = thumbnails[0];
  } else if (thumbnails.length > 1) {
    obj.thumbnailUrl = thumbnails;
  }

  if (uploadDate) obj.uploadDate = uploadDate;
  if (durationIso) obj.duration = durationIso;
  if (embedUrl) obj.embedUrl = embedUrl;
  if (contentUrl) obj.contentUrl = contentUrl;

  return obj;
}

export { SITE_ORIGIN as VIDEO_SITE_ORIGIN };
