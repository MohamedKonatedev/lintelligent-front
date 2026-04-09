import weeklySchedule from "@/data/weekly-schedule.json";

const WP_BASE = "http://cms.lintelligent.tv";

type WeeklyScheduleItem = {
  day: string;
  start: string;
  end: string;
  emission: string;
  type: string;
};

export type WpEmission = {
  id: number;
  slug: string;
  title: { rendered: string };
  featured_media?: number;
  acf?: {
    description?: string;
    animateur?: string;
    image_emission?: unknown;
  };
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url?: string;
    }>;
  };
};

type WpMedia = {
  id: number;
  source_url?: string;
};

type WpException = {
  id: number;
  title?: { rendered: string };
  acf?: {
    emission_remplacement?: number | number[] | { ID?: number; id?: number } | Array<{ ID?: number; id?: number }>;
    date_exception?: string;
    heure_debut?: string;
    heure_fin?: string;
    type_action?: string;
    titre_personnalise?: string;
  };
};

export type ScheduleEmission = {
  id: number;
  title: string;
  slug: string;
  image: string | null;
  description: string;
  animateur: string;
};

export type ScheduleProgram = {
  id: string;
  date: string;
  start: string;
  end: string;
  type: string;
  title: string;
  emission: ScheduleEmission | null;
};

function normalizeUrl(url: string) {
  return url.replace("https://cms.lintelligent.tv", "http://cms.lintelligent.tv");
}

function cleanText(value?: string) {
  return (value ?? "")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "’")
    .replace(/&#038;/g, "&")
    .trim();
}

function pickAcfImageId(image: unknown): number | null {
  if (typeof image === "number") return image;

  if (
    image &&
    typeof image === "object" &&
    "ID" in image &&
    typeof (image as { ID?: unknown }).ID === "number"
  ) {
    return (image as { ID: number }).ID;
  }

  if (
    image &&
    typeof image === "object" &&
    "id" in image &&
    typeof (image as { id?: unknown }).id === "number"
  ) {
    return (image as { id: number }).id;
  }

  return null;
}

function pickAcfImageUrl(image: unknown): string | null {
  if (typeof image === "string" && image.startsWith("http")) {
    return normalizeUrl(image);
  }

  if (
    image &&
    typeof image === "object" &&
    "url" in image &&
    typeof (image as { url?: unknown }).url === "string"
  ) {
    return normalizeUrl((image as { url: string }).url);
  }

  return null;
}

function getWeekDatesFromToday() {
  const now = new Date();
  const jsDay = now.getDay();
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;

  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diffToMonday);

  return {
    lundi: new Date(monday),
    mardi: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1),
    mercredi: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 2),
    jeudi: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3),
    vendredi: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4),
    samedi: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 5),
    dimanche: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6),
  };
}

function dateToAcfYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function normalizeTime(value?: string) {
  if (!value) return "";
  return value.trim().slice(0, 5);
}

function normalizeDate(value?: string) {
  if (!value) return "";
  return value.replaceAll("-", "").slice(0, 8);
}

function getExceptionEmissionId(
  value?: number | number[] | { ID?: number; id?: number } | Array<{ ID?: number; id?: number }>
) {
  if (typeof value === "number") return value;

  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "number") return first;
    if (first && typeof first === "object") {
      if (typeof first.ID === "number") return first.ID;
      if (typeof first.id === "number") return first.id;
    }
    return null;
  }

  if (value && typeof value === "object") {
    if (typeof value.ID === "number") return value.ID;
    if (typeof value.id === "number") return value.id;
  }

  return null;
}

function makeProgramKey(date: string, start: string, end: string) {
  return `${normalizeDate(date)}__${normalizeTime(start)}__${normalizeTime(end)}`;
}

export async function getPrograms(): Promise<ScheduleProgram[]> {
  let emissionsRes: Response;
  let mediaRes: Response;
  let exceptionsRes: Response;

  try {
    [emissionsRes, mediaRes, exceptionsRes] = await Promise.all([
      fetch(`${WP_BASE}/wp-json/wp/v2/emissions?per_page=100&_embed`, {
        next: { revalidate: 300 },
      }),
      fetch(`${WP_BASE}/wp-json/wp/v2/media?per_page=100`, {
        next: { revalidate: 300 },
      }),
      fetch(`${WP_BASE}/wp-json/wp/v2/exceptions-prog?per_page=100`, {
        next: { revalidate: 60 },
      }),
    ]);
  } catch {
    // Réseau / DNS indisponible (ex. build sans accès au CMS)
    return [];
  }

  if (!emissionsRes.ok || !mediaRes.ok || !exceptionsRes.ok) {
    return [];
  }

  let rawEmissions: WpEmission[];
  let rawMedia: WpMedia[];
  let rawExceptions: WpException[];

  try {
    rawEmissions = await emissionsRes.json();
    rawMedia = await mediaRes.json();
    rawExceptions = await exceptionsRes.json();
  } catch {
    return [];
  }

  const mediaMap = new Map<number, string>(
    rawMedia
      .filter((item) => item.id && item.source_url)
      .map((item) => [item.id, normalizeUrl(item.source_url as string)])
  );

  const emissionsBySlug = new Map<string, ScheduleEmission>();
  const emissionsById = new Map<number, ScheduleEmission>();

  for (const emission of rawEmissions) {
    const acfImageUrl = pickAcfImageUrl(emission.acf?.image_emission);
    const acfImageId = pickAcfImageId(emission.acf?.image_emission);
    const embeddedFeatured = emission._embedded?.["wp:featuredmedia"]?.[0]?.source_url
      ? normalizeUrl(emission._embedded["wp:featuredmedia"][0].source_url as string)
      : null;
    const featuredMediaUrl =
      typeof emission.featured_media === "number"
        ? mediaMap.get(emission.featured_media) ?? null
        : null;
    const acfImageFromId = acfImageId ? mediaMap.get(acfImageId) ?? null : null;

    const finalImage =
      acfImageUrl || acfImageFromId || embeddedFeatured || featuredMediaUrl || null;

    const mapped: ScheduleEmission = {
      id: emission.id,
      title: cleanText(emission.title?.rendered),
      slug: emission.slug,
      image: finalImage,
      description: emission.acf?.description ?? "",
      animateur: emission.acf?.animateur ?? "",
    };

    emissionsBySlug.set(emission.slug, mapped);
    emissionsById.set(emission.id, mapped);
  }

  const weekDates = getWeekDatesFromToday();
  const schedule = weeklySchedule as WeeklyScheduleItem[];

  const basePrograms: ScheduleProgram[] = schedule.map((item, index) => {
    const emission = emissionsBySlug.get(item.emission) ?? null;
    const dayDate = weekDates[item.day as keyof typeof weekDates];
    const date = dateToAcfYmd(dayDate);

    return {
      id: `${item.day}-${item.start}-${item.emission}-${index}`,
      date,
      start: normalizeTime(item.start),
      end: normalizeTime(item.end),
      type: item.type,
      title: emission?.title ?? item.emission,
      emission,
    };
  });

  const programMap = new Map<string, ScheduleProgram>(
    basePrograms.map((program) => [makeProgramKey(program.date, program.start, program.end), program])
  );

  for (const exception of rawExceptions) {
    const acf = exception.acf;
    const date = normalizeDate(acf?.date_exception);
    const start = normalizeTime(acf?.heure_debut);
    const end = normalizeTime(acf?.heure_fin);
    const action = cleanText(acf?.type_action).toLowerCase();

    if (!date || !start || !end || !action) continue;

    const key = makeProgramKey(date, start, end);

    if (action === "suppression") {
      programMap.delete(key);
      continue;
    }

    const replacementEmissionId = getExceptionEmissionId(acf?.emission_remplacement);
    const replacementEmission =
      replacementEmissionId !== null ? emissionsById.get(replacementEmissionId) ?? null : null;

    const customTitle = cleanText(acf?.titre_personnalise);
    const title =
      customTitle ||
      replacementEmission?.title ||
      cleanText(exception.title?.rendered) ||
      "Programme spécial";

    const replacementProgram: ScheduleProgram = {
      id: `exception-${exception.id}`,
      date,
      start,
      end,
      type:
        action === "special"
          ? "special"
          : action === "remplacement"
          ? "modified"
          : "normal",
      title,
      emission: replacementEmission,
    };

    programMap.set(key, replacementProgram);
  }

  return Array.from(programMap.values()).sort((a, b) =>
    `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)
  );
}