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