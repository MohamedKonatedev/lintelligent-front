import type { ReactNode } from "react";

export type SocialLink = {
  name: string;
  href: string;
};

/** Profils vérifiés (hors LinkedIn entreprise, géré via variable d’environnement). */
const VERIFIED_SOCIALS: SocialLink[] = [
  {
    name: "YouTube",
    href: "https://m.youtube.com/channel/UC23vhsEy8dqmxPV1bC6r7uQ",
  },
  { name: "Facebook", href: "https://www.facebook.com/INTELLIGENTTV/" },
  { name: "X", href: "https://twitter.com/LintelligentTv" },
  { name: "Twitch", href: "https://www.twitch.tv/intelligentdirect" },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@lintelligenttv?_r=1&_t=ZS-94nqpvs09ah",
  },
  { name: "Limex", href: "https://limex.tv/lintelligent_tv_fr" },
];

function linkedInCompanyUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_LINKEDIN_COMPANY_URL?.trim();
  if (!raw) return null;
  if (/\/in\//i.test(raw)) return null;
  if (!/^https?:\/\//i.test(raw)) return null;
  return raw;
}

/** Liens affichés dans l’UI (LinkedIn uniquement si URL entreprise configurée). */
export function getSocialLinks(): SocialLink[] {
  const links = [...VERIFIED_SOCIALS];
  const linkedIn = linkedInCompanyUrl();
  if (linkedIn) {
    links.splice(2, 0, { name: "LinkedIn", href: linkedIn });
  }
  return links;
}

/** URLs pour schema.org `sameAs` (profils confirmés uniquement). */
export function getSameAsUrls(): string[] {
  const urls = VERIFIED_SOCIALS.map((s) => s.href);
  const linkedIn = linkedInCompanyUrl();
  if (linkedIn) urls.push(linkedIn);
  return urls;
}

export type SocialLinkWithIcon = SocialLink & { icon: ReactNode };
