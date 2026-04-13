import type { MetadataRoute } from "next";
import { PROGRAMS } from "./programmes/programs";
import { getVideosSliceForSitemap, getVideosSitemapMeta } from "@/lib/wordpress";

const baseUrl = "https://lintelligent.tv";

/** Limite Google : 50 000 URLs par fichier ; on reste largement en dessous pour limiter le temps de génération. */
const VIDEOS_PER_SITEMAP_FILE = 10_000;

const CORE_SITEMAP_ID = 0;

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
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));

  const programSlugs = PROGRAMS.map((p) => p.slug);

  const programmePages: MetadataRoute.Sitemap = programSlugs.map((slug) => ({
    url: `${baseUrl}/programmes/${slug}`,
    lastModified: new Date(),
  }));

  const replayProgramPages: MetadataRoute.Sitemap = programSlugs.map((slug) => ({
    url: `${baseUrl}/replays/${slug}`,
    lastModified: new Date(),
  }));

  return [...staticEntries, ...programmePages, ...replayProgramPages];
}

export async function generateSitemaps() {
  const meta = await getVideosSitemapMeta();
  const total = meta?.total ?? 0;
  const videoSitemapCount =
    total === 0 ? 0 : Math.ceil(total / VIDEOS_PER_SITEMAP_FILE);

  const ids: { id: number }[] = [{ id: CORE_SITEMAP_ID }];
  for (let i = 0; i < videoSitemapCount; i += 1) {
    ids.push({ id: i + 1 });
  }
  return ids;
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
    url: `${baseUrl}/videos/${video.slug}`,
    lastModified: lastModFromPost(video),
  }));
}
