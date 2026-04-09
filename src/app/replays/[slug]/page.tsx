import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/app/components/SiteHeader";
import ReplaysArchiveList from "@/app/components/ReplaysArchiveList";
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

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const program = PROGRAMS_MAP[slug];

  if (!program) {
    return {
      title: "Replays | L'Intelligent TV",
    };
  }

  return {
    title: `${program.title} | Replays`,
    description: `Retrouvez les replays de ${program.title}.`,
  };
}

export default async function ReplayProgramPage({ params }: PageProps) {
  const { slug } = await params;
  const program = PROGRAMS_MAP[slug];

  if (!program) {
    notFound();
  }

  const category = await getCategoryBySlug(slug);
  const videos = await getAllVideos(100);

  // Version plus propre de filteredVideos proposée
  const filteredVideos = category?.id
    ? videos.filter(
        (video: any) =>
          Array.isArray(video.categories) && video.categories.includes(category.id)
      )
    : [];

  const featuredPost = filteredVideos.length > 0 ? filteredVideos[0] : null;
  const imageFromCMS = featuredPost ? getFeaturedImage(featuredPost) : null;

  const serializedVideos = filteredVideos.map((video: any) => ({
    id: video.id,
    slug: video.slug,
    link: video.link || "#",
    title: video.title?.rendered || "",
    excerpt: stripHtml(video.excerpt?.rendered || ""),
    date: formatDate(video.date),
    image: getFeaturedImage(video) || program.imageDesktop,
  }));

  return (
    <main className="min-h-screen bg-[#070b1a] text-white">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          {imageFromCMS ? (
            <Image
              src={imageFromCMS as string}
              alt={featuredPost?.title?.rendered || "Image replays"}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <Image
              src="/bg-live.jpg"
              alt="Fond replays"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,20,0.38)_0%,rgba(5,8,20,0.18)_20%,rgba(5,8,20,0.12)_44%,rgba(5,8,20,0.62)_78%,rgba(5,8,20,0.92)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,11,26,0.55)_0%,rgba(7,11,26,0.15)_45%,rgba(7,11,26,0.45)_100%)]" />
        </div>

        <div className="relative mx-auto flex min-h-[42vh] max-w-7xl flex-col justify-between px-4 pb-8 pt-28 sm:min-h-[48vh] sm:px-6 sm:pb-10 lg:min-h-[54vh] lg:px-8 lg:pb-14 lg:pt-32">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/78 sm:text-xs">
              Replays
            </p>
          </div>
          <div className="max-w-3xl">
            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              {program.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              Retrouvez toutes les émissions en replay de {program.title}.
            </p>
            <div className="mt-6">
              <Link
                href="/replays"
                className="inline-flex items-center rounded-full border border-white/14 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/[0.09]"
              >
                ← Retour aux replays
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <ReplaysArchiveList videos={serializedVideos} />
      </section>
    </main>
  );
}