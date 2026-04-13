import { getVideosSitemapMeta } from "@/lib/wordpress";

export const SITE_BASE_URL = "https://lintelligent.tv";

/** Doit rester aligné avec la limite utilisée dans `app/sitemap.ts`. */
export const VIDEOS_PER_SITEMAP_FILE = 10_000;

export const CORE_SITEMAP_ID = 0;

/** Identifiants des fichiers `/sitemap/{id}.xml` (core + tranches vidéo). */
export async function getSitemapShardIds(): Promise<number[]> {
  const meta = await getVideosSitemapMeta();
  const total = meta?.total ?? 0;
  const videoSitemapCount =
    total === 0 ? 0 : Math.ceil(total / VIDEOS_PER_SITEMAP_FILE);

  const ids: number[] = [CORE_SITEMAP_ID];
  for (let i = 0; i < videoSitemapCount; i += 1) {
    ids.push(i + 1);
  }
  return ids;
}
