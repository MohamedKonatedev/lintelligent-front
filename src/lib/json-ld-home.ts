import {
  ORGANIZATION_LOGO_PATH,
  SITE_NAME,
  SITE_ORIGIN,
  absoluteUrl,
} from "@/lib/site";
import { getSameAsUrls } from "@/lib/social-links";

export function buildHomeJsonLd(): Record<string, unknown>[] {
  const logoUrl = absoluteUrl(ORGANIZATION_LOGO_PATH);
  const sameAs = getSameAsUrls();

  const organization: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: {
      "@type": "ImageObject",
      url: logoUrl,
    },
  };

  if (sameAs.length > 0) {
    organization.sameAs = sameAs;
  }

  const website: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    inLanguage: "fr-FR",
  };

  return [organization, website];
}
