export type ProgramConfig = {
  slug: string;
  title: string;
  day: string;
  time: string;
  host: string;
  mobileMeta: string;
  href: string;
  logo: string;
  imageDesktop: string;
  imageMobile: string;
  accent: string;
  logoD: string;
  logoT: string;
  logoM: string;
  description: string;
};

const P = (slug: string) => ({
  logo: `/programs/${slug}-logo.png`,
  imageDesktop: `/programs/${slug}-hero-desktop.jpg`,
  imageMobile: `/programs/${slug}-hero-mobile.jpg`,
});

export const PROGRAMS: ProgramConfig[] = [
  {
    slug: "les-entretiens",
    title: "Les Entretiens",
    day: "TOUS LES JEUDIS",
    time: "14:40 GMT",
    host: "avec Ibrahim Khalil KONE",
    mobileMeta: "Tous les jeudis à 14h40",
    href: "/programmes/les-entretiens",
    ...P("les-entretiens"),
    accent: "#1fb7cc",
    logoD: "240px",
    logoT: "150px",
    logoM: "150px",
    description:
      "Une émission d’analyse et d’échange qui donne la parole aux acteurs de l’actualité et met en lumière les grands enjeux de société.",
  },
  {
    slug: "le-debat",
    title: "Le Débat",
    day: "TOUS LES MERCREDIS",
    time: "19:00 GMT",
    host: "avec Ibrahim Khalil KONE",
    mobileMeta: "Tous les mercredis à 19h00",
    href: "/programmes/le-debat",
    ...P("le-debat"),
    accent: "#1fc423",
    logoD: "295px",
    logoT: "188px",
    logoM: "92px",
    description:
      "Un rendez-vous de confrontation d’idées autour des sujets majeurs de l’actualité politique, économique et sociale.",
  },
  {
    slug: "a-vous-la-parole",
    title: "À vous la parole",
    day: "TOUS LES MARDIS",
    time: "12:50 GMT",
    host: "avec Ange KOUADIO",
    mobileMeta: "Tous les mardis à 12h50",
    href: "/programmes/a-vous-la-parole",
    ...P("a-vous-la-parole"),
    accent: "#e21a23",
    logoD: "360px",
    logoT: "240px",
    logoM: "108px",
    description:
      "Une émission participative où les citoyens, observateurs et invités s’expriment librement sur les grands sujets qui concernent la société.",
  },
  {
    slug: "linvite",
    title: "L'Invité",
    day: "TOUS LES LUNDIS",
    time: "12:50 GMT",
    host: "avec Ange KOUADIO",
    mobileMeta: "Tous les lundis à 12h50",
    href: "/programmes/linvite",
    ...P("linvite"),
    accent: "#d9a11a",
    logoD: "350px",
    logoT: "230px",
    logoM: "130px",
    description:
      "Un face-à-face avec une personnalité au cœur de l’actualité pour mieux comprendre ses positions, son parcours et sa vision.",
  },
  {
    slug: "la-quotidienne-du-sport",
    title: "La Quotidienne du Sport",
    day: "DU MARDI AU VENDREDI",
    time: "16:30 GMT",
    host: "avec Ange KOUADIO",
    mobileMeta: "Du mardi au vendredi à 16h30",
    href: "/programmes/la-quotidienne-du-sport",
    ...P("la-quotidienne-du-sport"),
    accent: "#2b8cff",
    logoD: "345px",
    logoT: "225px",
    logoM: "150px",
    description:
      "Toute l’actualité sportive, les résultats, les analyses et les temps forts pour suivre le sport au quotidien.",
  },
  {
    slug: "la-revue-de-presse-grand-format",
    title: "La Revue de Presse Grand Format",
    day: "TOUS LES VENDREDIS",
    time: "17:50 GMT",
    host: "avec Ibrahim Khalil KONE",
    mobileMeta: "Tous les vendredis à 17h50",
    href: "/programmes/la-revue-de-presse-grand-format",
    ...P("la-revue-de-presse-grand-format"),
    accent: "#8d5cf6",
    logoD: "320px",
    logoT: "220px",
    logoM: "130px",
    description:
      "Une lecture approfondie de l’actualité à travers les journaux, analyses, éditoriaux et grands sujets du moment.",
  },
  {
    slug: "lintelligent-club",
    title: "L'Intelligent Club",
    day: "TOUS LES LUNDIS",
    time: "09:10 GMT",
    host: "avec Ange KOUADIO",
    mobileMeta: "Tous les lundis à 09h10",
    href: "/programmes/lintelligent-club",
    ...P("lintelligent-club"),
    accent: "#2563eb",
    logoD: "320px",
    logoT: "220px",
    logoM: "130px",
    description:
      "Le talk-show de L’Intelligent TV : décryptages, invités et regards croisés sur l’actualité.",
  },
];

export const PROGRAMS_MAP = Object.fromEntries(
  PROGRAMS.map((program) => [program.slug, program])
);
