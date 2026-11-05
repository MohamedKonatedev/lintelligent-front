/** URL canonique du site (sans slash final). */
export const SITE_ORIGIN =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://lintelligent.tv").replace(/\/$/, "");

export const SITE_NAME = "L'Intelligent TV";

export const DEFAULT_OG_IMAGE = "/og-image.jpeg";

export const ORGANIZATION_LOGO_PATH = "/home/IAtv-logo.png";

export function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${p}`;
}
