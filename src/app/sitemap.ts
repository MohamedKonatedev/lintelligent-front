/**
 * Sous-sitemaps `/sitemap/{id}.xml` via `generateSitemaps`.
 * L’index `/sitemap.xml` est servi par rewrite → `GET /api/sitemap-index` (voir next.config.ts),
 * car Next ne déclare pas d’URL racine pour l’index dans ce mode.
 */
import type { MetadataRoute } from "next";
import { PROGRAMS } from "./programmes/programs";
import {
  CORE_SITEMAP_ID,
  SITE_BASE_URL,
  VIDEOS_PER_SITEMAP_FILE,
  getSitemapShardIds,
} from "@/lib/sitemap-shards";
import { getVideosSliceForSitemap } from "@/lib/wordpress";

function lastModFromPost(post: { modified?: string; date?: string }): Date {
  const raw = post.modified || post.date;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function coreSitemapEntries(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "/live",
    "/replays",
    "/replays/archive",
    "/programmes",
    "/grille-programmes",
    "/notre-chaine",
    "/contact",
    "/mentions-legales",
    "/politique-confidentialite",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${SITE_BASE_URL}${path}`,
    lastModified: new Date(),
  }));

  const programSlugs = PROGRAMS.map((p) => p.slug);

  const programmePages: MetadataRoute.Sitemap = programSlugs.map((slug) => ({
    url: `${SITE_BASE_URL}/programmes/${slug}`,
    lastModified: new Date(),
  }));

  const replayProgramPages: MetadataRoute.Sitemap = programSlugs.map((slug) => ({
    url: `${SITE_BASE_URL}/replays/${slug}`,
    lastModified: new Date(),
  }));

  return [...staticEntries, ...programmePages, ...replayProgramPages];
}

export async function generateSitemaps() {
  const ids = await getSitemapShardIds();
  return ids.map((id) => ({ id }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number.parseInt(await props.id, 10);

  if (id === CORE_SITEMAP_ID || Number.isNaN(id)) {
    return coreSitemapEntries();
  }

  const chunkIndex = id - 1;
  const offset = chunkIndex * VIDEOS_PER_SITEMAP_FILE;
  const videos = await getVideosSliceForSitemap(offset, VIDEOS_PER_SITEMAP_FILE);

  return videos.map((video) => ({
    url: `${SITE_BASE_URL}/videos/${video.slug}`,
    lastModified: lastModFromPost(video),
  }));
}
