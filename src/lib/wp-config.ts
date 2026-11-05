/** Base REST WordPress (sans slash final). Surchargeable pour le VPS LWS. */
export function getWpApiBase(): string {
  const fromEnv = process.env.WP_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return "http://cms.lintelligent.tv/wp-json/wp/v2";
}

export function getWpOrigin(): string {
  const base = getWpApiBase();
  const match = base.match(/^(https?:\/\/[^/]+)/);
  return match?.[1] ?? "http://cms.lintelligent.tv";
}
