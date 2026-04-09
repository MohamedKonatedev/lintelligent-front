const WP_API = "http://cms.lintelligent.tv/wp-json/wp/v2";

export type WpPost = {
  id: number;
  date: string;
  slug: string;
  link: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
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
  const res = await fetch(`${WP_API}/categories?slug=${slug}`, {
    next: { revalidate: 120 },
  });

  if (!res.ok) return null;

  const data: WpCategory[] = await res.json();
  return data[0] ?? null;
}

export async function getPostsByCategorySlug(slug: string, perPage = 9): Promise<WpPost[]> {
  const category = await getCategoryBySlug(slug);

  if (!category) return [];

  const res = await fetch(
    `${WP_API}/videos?categories=${category.id}&per_page=${perPage}&_embed`,
    {
      next: { revalidate: 120 },
    }
  );

  if (!res.ok) return [];

  return res.json();
}

export async function getAllVideos(perPage = 24): Promise<WpPost[]> {
  const res = await fetch(`${WP_API}/videos?per_page=${perPage}&_embed`, {
    next: { revalidate: 120 },
  });

  if (!res.ok) return [];

  return res.json();
}

export function getFeaturedImage(post: WpPost): string | null {
  const url = post?._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;

  if (!url) return null;

  return url
    .replace("http://cms.lintelligent.tv", "https://cms.lintelligent.tv")
    .replace("https://cms.lintelligent.tv", "https://cms.lintelligent.tv");
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}