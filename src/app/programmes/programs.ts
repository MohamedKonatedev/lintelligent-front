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
  
  export const PROGRAMS: ProgramConfig[] = [
    {
      slug: "les-entretiens",
      title: "Les Entretiens",
      day: "TOUS LES MERCREDIS",
      time: "18:00 GMT",
      host: "avec Ibrahim Khalil KONE",
      mobileMeta: "Tous les mercredis à 18h00",
      href: "/programmes/les-entretiens",
      logo: "/home/logo-emission-1.png",
      imageDesktop: "/home/slide-1.png",
      imageMobile: "/home/slide-1mobile.png",
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
      day: "TOUS LES JEUDIS",
      time: "18:00 GMT",
      host: "avec Ibrahim Khalil KONE",
      mobileMeta: "Tous les jeudis à 18h00",
      href: "/programmes/le-debat",
      logo: "/home/logo-emission-2.png",
      imageDesktop: "/home/slide-2.png",
      imageMobile: "/home/slide-2mobile.png",
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
      time: "18:00 GMT",
      host: "avec Ange KOUADIO",
      mobileMeta: "Tous les mardis à 18h00",
      href: "/programmes/a-vous-la-parole",
      logo: "/home/logo-emission-3.png",
      imageDesktop: "/home/slide-3.png",
      imageMobile: "/home/slide-3mobile.png",
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
      day: "TOUS LES MARDIS",
      time: "10:30 GMT",
      host: "avec Ange KOUADIO",
      mobileMeta: "Tous les mardis à 10h30",
      href: "/programmes/linvite",
      logo: "/home/logo-emission-4.png",
      imageDesktop: "/home/slide-4.png",
      imageMobile: "/home/slide-4mobile.png",
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
      day: "TOUS LES JOURS",
      time: "19:00 GMT",
      host: "avec Ange KOUADIO",
      mobileMeta: "Tous les jours à 19h00",
      href: "/programmes/la-quotidienne-du-sport",
      logo: "/home/logo-emission-5.png",
      imageDesktop: "/home/slide-5.png",
      imageMobile: "/home/slide-5mobile.png",
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
      day: "TOUS LES LUNDIS",
      time: "08:00 GMT",
      host: "avec la rédaction",
      mobileMeta: "Tous les lundis à 08h00",
      href: "/programmes/la-revue-de-presse-grand-format",
      logo: "/home/logo-emission-5.png",
      imageDesktop: "/home/slide-5.png",
      imageMobile: "/home/slide-5mobile.png",
      accent: "#8d5cf6",
      logoD: "320px",
      logoT: "220px",
      logoM: "130px",
      description:
        "Une lecture approfondie de l’actualité à travers les journaux, analyses, éditoriaux et grands sujets du moment.",
    },
    {
      slug: "actu-sport",
      title: "Actu Sport",
      day: "Du lundi au vendredi",
      time: "17:00 GMT",
      host: "Ibrahim Khalil KONE",
      mobileMeta: "Du lundi au vendredi • 17:00 GMT",
      href: "/programmes/actu-sport",
      logo: "/home/logo-actu-sport.png",
      imageDesktop: "/home/actu sport.png",
      imageMobile: "/home/actu sport.png",
      accent: "#16a34a",
      logoD: "",
      logoT: "",
      logoM: "",
      description: "Toute l’actualité sportive, les résultats, les analyses et les temps forts pour suivre le sport au quotidien."
    },
  ];
  
  export const PROGRAMS_MAP = Object.fromEntries(
    PROGRAMS.map((program) => [program.slug, program])
  );