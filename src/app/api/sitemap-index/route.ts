import { NextResponse } from "next/server";
import { getSitemapShardIds, SITE_BASE_URL } from "@/lib/sitemap-shards";

/**
 * Corps XML de l’index ; exposé via /sitemap.xml grâce au rewrite dans next.config.ts
 * (Next ne publie pas d’index sur /sitemap.xml quand `generateSitemaps` est utilisé).
 */
export const revalidate = 3600;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const ids = await getSitemapShardIds();
  const lines = ids.map(
    (id) =>
      `  <sitemap>\n    <loc>${escapeXml(`${SITE_BASE_URL}/sitemap/${id}.xml`)}</loc>\n  </sitemap>`
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${lines.join("\n")}
</sitemapindex>
`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate",
    },
  });
}
