import { NextRequest, NextResponse } from "next/server";

const WP_BASE = "http://cms.lintelligent.tv";

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

function toProgramHref(name: string) {
  const map: Record<string, string> = {
    "Le Débat": "/programmes/le-debat",
    "L'Invité": "/programmes/linvite",
    "À vous la parole": "/programmes/a-vous-la-parole",
    "A vous la parole": "/programmes/a-vous-la-parole",
    "Les Entretiens": "/programmes/les-entretiens",
    "La Quotidienne du Sport": "/programmes/la-quotidienne-du-sport",
    "Actu Sport": "/programmes/actu-sport",
    "Grand Format": "/programmes/grand-format",
    "L'Intelligent Club": "/programmes/lintelligent-club",
  };

  return map[name] || undefined;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim();

  if (!slug) {
    return NextResponse.json({ programLabel: null, programHref: null, title: null });
  }

  try {
    const res = await fetch(
      `${WP_BASE}/wp-json/wp/v2/videos?slug=${encodeURIComponent(slug)}&_embed`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ programLabel: null, programHref: null, title: null });
    }

    const data = await res.json();
    const video = Array.isArray(data) ? data[0] : null;

    if (!video) {
      return NextResponse.json({ programLabel: null, programHref: null, title: null });
    }

    const title = decodeHtml(video?.title?.rendered || slug);

    let programLabel: string | null = null;

    const terms = video?._embedded?.["wp:term"];
    if (Array.isArray(terms)) {
      for (const group of terms) {
        if (Array.isArray(group) && group.length > 0) {
          const found = group.find((term: any) => term?.taxonomy === "category");
          if (found?.name) {
            programLabel = decodeHtml(found.name);
            break;
          }
        }
      }
    }

    const programHref = programLabel ? toProgramHref(programLabel) : null;

    return NextResponse.json({
      programLabel,
      programHref,
      title,
    });
  } catch (error) {
    console.error("video-breadcrumb error:", error);
    return NextResponse.json({ programLabel: null, programHref: null, title: null });
  }
}