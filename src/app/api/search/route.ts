import { NextRequest, NextResponse } from "next/server";

const WP_BASE = "http://cms.lintelligent.tv";

type WpItem = {
  id: number;
  slug: string;
  title?: {
    rendered?: string;
  };
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url?: string;
    }>;
  };
};

function decodeHtml(value: string) {
  return value
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8230;/g, "…")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rdquo;/g, "”")
    .replace(/&ldquo;/g, "“")
    .replace(/&hellip;/g, "…")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function getImage(item: WpItem) {
  return item._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const [videosRes, emissionsRes] = await Promise.all([
      fetch(
        `${WP_BASE}/wp-json/wp/v2/videos?search=${encodeURIComponent(
          q
        )}&per_page=6&_embed`,
        { cache: "no-store" }
      ),
      fetch(
        `${WP_BASE}/wp-json/wp/v2/emissions?search=${encodeURIComponent(
          q
        )}&per_page=6&_embed`,
        { cache: "no-store" }
      ),
    ]);

    const videos: WpItem[] = videosRes.ok ? await videosRes.json() : [];
    const emissions: WpItem[] = emissionsRes.ok ? await emissionsRes.json() : [];

    const mappedVideos = videos.map((item) => ({
      id: `video-${item.id}`,
      title: decodeHtml(item.title?.rendered || "Vidéo"),
      type: "Vidéo",
      image: getImage(item),
      href: `/videos/${item.slug}`,
    }));

    const mappedEmissions = emissions.map((item) => ({
      id: `emission-${item.id}`,
      title: decodeHtml(item.title?.rendered || "Émission"),
      type: "Émission",
      image: getImage(item),
      href: `/programmes/${item.slug}`,
    }));

    return NextResponse.json([...mappedEmissions, ...mappedVideos].slice(0, 10));
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json([], { status: 200 });
  }
}