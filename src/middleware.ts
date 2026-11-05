import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Canonique : https://lintelligent.tv (308 permanent vers apex).
 * Complète la config domaine Vercel / Nginx côté infra.
 */
export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();

  if (host === "www.lintelligent.tv") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = "lintelligent.tv";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
