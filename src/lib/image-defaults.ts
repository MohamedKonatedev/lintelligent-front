/** Qualité par défaut — bon compromis poids / rendu sur écrans TV et mobile. */
export const IMAGE_QUALITY = 78;

export const PROGRAM_HOME_SQUARE_SIZES =
  "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 420px";

/** Hero mobile : smartphones uniquement (< 640px). Tablette + desktop = visuel desktop. */
export const HERO_MOBILE_MEDIA = "(max-width: 639px)";
export const HERO_MOBILE_SIZES = "100vw";
export const HERO_DESKTOP_SIZES = "100vw";
/** @deprecated Utiliser HERO_MOBILE_SIZES / HERO_DESKTOP_SIZES */
export const HERO_SLIDE_SIZES = HERO_MOBILE_SIZES;

export const REPLAY_THUMB_SIZES =
  "(max-width: 640px) 45vw, (max-width: 1024px) 220px, 260px";

/** Affiche statique légère pour le LCP accueil (avant attache HLS). */
export const HOME_LIVE_POSTER = "/og-image.jpeg";
