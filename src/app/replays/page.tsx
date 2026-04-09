import SiteHeader from "@/app/components/SiteHeader";
import ReplaysCatalog from "@/app/components/ReplaysCatalog";
import {
  getAllVideos,
  getCategoryBySlug,
  getReplayCardImage,
  stripHtml,
} from "@/lib/wordpress";
import { PROGRAMS_MAP } from "@/app/programmes/programs";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export const metadata = {
  title: "Replays | L'Intelligent TV",
  description: "Retrouvez tous les replays de L'Intelligent TV.",
};

export default async function ReplaysPage() {
  const videos = await getAllVideos(80);

  const programEntries = [
    "les-entretiens",
    "le-debat",
    "a-vous-la-parole",
    "linvite",
    "la-quotidienne-du-sport",
    "la-revue-de-presse-grand-format",
    "lintelligent-club",
  ];

  const categories = await Promise.all(
    programEntries.map(async (slug) => {
      const category = await getCategoryBySlug(slug);
      const program = PROGRAMS_MAP[slug];

      return {
        slug,
        id: category?.id ?? null,
        title: program?.title ?? slug,
        accent: program?.accent ?? "#e21a23",
      };
    })
  );

  const serializedVideos = videos.map((video: any) => ({
    id: video.id,
    slug: video.slug,
    link: video.link || "#",
    title: video.title?.rendered || "",
    excerpt: stripHtml(video.excerpt?.rendered || ""),
    date: formatDate(video.date),
    image: getReplayCardImage(video) || "/programs/les-entretiens-home-square.jpg",
    categories: Array.isArray(video.categories) ? video.categories : [],
  }));

  return (
    <main className="min-h-screen bg-[#070b1a] text-white">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#08101f_0%,#09142c_48%,#0a1020_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(227,25,35,0.18),transparent_28%)]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-28 sm:px-6 lg:px-8 lg:pb-14 lg:pt-32">
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            Replays
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
            Retrouvez les dernières émissions, interviews et débats en replay.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <ReplaysCatalog videos={serializedVideos} categories={categories} />

        <section className="mt-14 sm:mt-16">
          <a
            href="/live"
            className="group relative block overflow-hidden rounded-[24px] border border-white/12 bg-white/[0.03] px-5 py-5 backdrop-blur-sm transition hover:bg-white/[0.05] sm:px-7 sm:py-6"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(227,25,35,0.12),transparent_32%)]" />
            <div className="relative flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">
                  Voir le live
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/68 sm:text-base">
                  Accédez au direct et suivez la diffusion en temps réel.
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-sm font-bold text-red-400 sm:h-14 sm:w-14 sm:text-base">
                  LIVE
                </span>
              </div>
            </div>
          </a>
        </section>
      </section>
    </main>
  );
}