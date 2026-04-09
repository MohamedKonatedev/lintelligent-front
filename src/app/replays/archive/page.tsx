import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import {
  getAllVideos,
  getCategoryBySlug,
  getFeaturedImage,
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

type ArchivePageProps = {
  searchParams: Promise<{
    filter?: string;
  }>;
};

export async function generateMetadata({ searchParams }: ArchivePageProps) {
  const { filter } = await searchParams;
  const program = filter ? PROGRAMS_MAP[filter] : null;

  return {
    title: program
      ? `${program.title} | Archive Replays`
      : "Archive Replays | L'Intelligent TV",
    description: program
      ? `Tous les replays de ${program.title}.`
      : "Toutes les archives replay de L'Intelligent TV.",
  };
}

export default async function ReplaysArchivePage({
  searchParams,
}: ArchivePageProps) {
  const { filter } = await searchParams;
  const videos = await getAllVideos(100);

  let filteredVideos = videos;
  let currentProgram = null;
  let categoryId: number | null = null;

  if (filter && PROGRAMS_MAP[filter]) {
    currentProgram = PROGRAMS_MAP[filter];
    const category = await getCategoryBySlug(filter);
    categoryId = category?.id ?? null;

    if (categoryId) {
      filteredVideos = videos.filter((video: any) =>
        Array.isArray(video.categories) ? video.categories.includes(categoryId) : false
      );
    } else {
      filteredVideos = [];
    }
  }

  return (
    <main className="min-h-screen bg-[#070b1a] text-white">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#08101f_0%,#09142c_48%,#0a1020_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(227,25,35,0.18),transparent_28%)]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-28 sm:px-6 lg:px-8 lg:pb-14 lg:pt-32">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-400 sm:text-xs">
            Archive
          </p>

          <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            {currentProgram ? currentProgram.title : "Tous les replays"}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
            {currentProgram
              ? `Retrouvez toutes les émissions en replay de ${currentProgram.title}.`
              : "Retrouvez toutes les émissions en replay de L'Intelligent TV."}
          </p>

          <div className="mt-6">
            <Link
              href="/replays"
              className="inline-flex items-center rounded-full border border-white/14 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              ← Retour aux replays
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {filteredVideos.length === 0 ? (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-8 text-white/70">
            Aucun replay disponible pour cette archive.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredVideos.map((video: any, index: number) => (
              <Link
                key={video.id}
                href={video.link || "#"}
                className="group overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:bg-white/[0.06]"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-black">
                  <img
                    src={getFeaturedImage(video) || "/home/slide-1.png"}
                    alt={video.title?.rendered || "Replay"}
                    loading={index < 5 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                </div>

                <div className="p-3 sm:p-4">
                  <h3
                    className="line-clamp-2 text-sm font-bold leading-snug text-white sm:text-base"
                    dangerouslySetInnerHTML={{
                      __html: video.title?.rendered || "",
                    }}
                  />

                  <p className="mt-2 line-clamp-3 text-[12px] leading-5 text-white/62 sm:text-sm">
                    {stripHtml(video.excerpt?.rendered || "")}
                  </p>

                  <p className="mt-3 text-[11px] text-white/70 sm:text-xs">
                    {formatDate(video.date)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}