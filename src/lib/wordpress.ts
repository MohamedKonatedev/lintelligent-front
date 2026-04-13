import { getVideoUrlFromPost, getYoutubeThumbnail } from "./youtube-thumbnail";

const WP_API = "http://cms.lintelligent.tv/wp-json/wp/v2";

/** Fetch JSON depuis le CMS ; null si réseau / HTTP erreur / JSON invalide (évite un crash au build). */
async function wpFetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type WpPost = {
  id: number;
  date: string;
  modified?: string;
  slug: string;
  link: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  acf?: Record<string, unknown>;
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url: string;
      alt_text?: string;
    }>;
    author?: Array<{
      name: string;
    }>;
  };
};

export type WpCategory = {
  id: number;
  name: string;
  slug: string;
};

export async function getCategoryBySlug(slug: string): Promise<WpCategory | null> {
  const data = await wpFetchJson<WpCategory[]>(`${WP_API}/categories?slug=${slug}`, {
    next: { revalidate: 120 },
  });
  return data?.[0] ?? null;
}

export async function getPostsByCategorySlug(slug: string, perPage = 9): Promise<WpPost[]> {
  const category = await getCategoryBySlug(slug);

  if (!category) return [];

  const data = await wpFetchJson<WpPost[]>(
    `${WP_API}/videos?categories=${category.id}&per_page=${perPage}&_embed`,
    {
      next: { revalidate: 120 },
    }
  );

  return data ?? [];
}

export async function getAllVideos(perPage = 24): Promise<WpPost[]> {
  const data = await wpFetchJson<WpPost[]>(
    `${WP_API}/videos?per_page=${perPage}&_embed`,
    {
      next: { revalidate: 120 },
    }
  );

  return data ?? [];
}

const SITEMAP_VIDEO_PER_PAGE = 100;

/** En-têtes X-WP-Total / X-WP-TotalPages du endpoint `videos` (léger : per_page=1). */
export async function getVideosSitemapMeta(): Promise<{ total: number; totalPages: number } | null> {
  try {
    const res = await fetch(`${WP_API}/videos?per_page=1&page=1`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const total = Number.parseInt(res.headers.get("X-WP-Total") ?? "0", 10);
    const totalPages = Number.parseInt(res.headers.get("X-WP-TotalPages") ?? "0", 10);
    return { total, totalPages };
  } catch {
    return null;
  }
}

/** Une page de vidéos, champs minimaux pour le sitemap (sans _embed). */
export async function getVideosPageForSitemap(page: number): Promise<WpPost[]> {
  const fields = "slug,date,modified";
  const data = await wpFetchJson<WpPost[]>(
    `${WP_API}/videos?per_page=${SITEMAP_VIDEO_PER_PAGE}&page=${page}&_fields=${fields}`,
    { next: { revalidate: 3600 } }
  );
  return data ?? [];
}

/** Récupère `limit` vidéos à partir de l’offset global (pour découper le sitemap). */
export async function getVideosSliceForSitemap(offset: number, limit: number): Promise<WpPost[]> {
  const out: WpPost[] = [];
  let page = Math.floor(offset / SITEMAP_VIDEO_PER_PAGE) + 1;
  let skip = offset % SITEMAP_VIDEO_PER_PAGE;

  while (out.length < limit) {
    const batch = await getVideosPageForSitemap(page);
    if (batch.length === 0) break;
    const slice = skip > 0 ? batch.slice(skip) : batch;
    skip = 0;
    for (const post of slice) {
      out.push(post);
      if (out.length >= limit) break;
    }
    if (batch.length < SITEMAP_VIDEO_PER_PAGE) break;
    page += 1;
  }

  return out;
}

export function getFeaturedImage(post: WpPost): string | null {
  const url = post?._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;

  if (!url) return null;

  return url
    .replace("http://cms.lintelligent.tv", "https://cms.lintelligent.tv")
    .replace("https://cms.lintelligent.tv", "https://cms.lintelligent.tv");
}

/** Featured image, else YouTube thumbnail from ACF video URL, else null (caller supplies fallback). */
export function getReplayCardImage(post: WpPost): string | null {
  const featured = getFeaturedImage(post);
  if (featured) return featured;
  const videoUrl = getVideoUrlFromPost(post);
  return getYoutubeThumbnail(videoUrl);
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}