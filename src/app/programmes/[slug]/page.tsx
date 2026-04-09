import TrackRecentProgram from "@/app/components/TrackRecentProgram";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROGRAMS, PROGRAMS_MAP } from "../programs";
import ProgramSuggestionsCarousel from "@/app/components/ProgramSuggestionsCarousel";
import {
  getFeaturedImage,
  getPostsByCategorySlug,
  stripHtml,
} from "@/lib/wordpress";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export async function generateStaticParams() {
  return PROGRAMS.map((program) => ({
    slug: program.slug,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const program = PROGRAMS_MAP[slug];

  if (!program) {
    return {
      title: "Programme introuvable",
    };
  }

  return {
    title: `${program.title} | L'Intelligent TV`,
    description: program.description,
  };
}

export default async function ProgramPage({ params }: PageProps) {
  const { slug } = await params;
  const program = PROGRAMS_MAP[slug];

  if (!program) {
    notFound();
  }

  const posts = await getPostsByCategorySlug(slug, 9);
  const featuredPost = posts[0];

  const allowedSlugs = [
    "les-entretiens",
    "le-debat",
    "a-vous-la-parole",
    "linvite",
    "la-quotidienne-du-sport",
    "la-revue-de-presse-grand-format",
    "actu-sport",
  ];

  const suggestedPrograms = Object.values(PROGRAMS_MAP)
    .filter(
      (item) => item.slug !== program.slug && allowedSlugs.includes(item.slug)
    )
    .map((item) => ({
      slug: item.slug,
      title: item.title,
      day: item.day,
      time: item.time,
      host: item.host,
      image: item.imageMobile || item.imageDesktop,
      fallbackImage: item.imageDesktop,
    }));

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070b1a] text-white">
      <TrackRecentProgram
        id={slug}
        title={program.title}
        image={program.imageDesktop}
        url={`/programmes/${slug}`}
      />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="relative hidden h-full w-full md:block">
            <Image
              src={program.imageDesktop}
              alt={program.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 100vw"
              className="object-cover object-[center_top]"
            />
          </div>

          <div className="relative block h-full w-full md:hidden">
            <Image
              src={program.imageMobile}
              alt={program.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-top"
            />
          </div>

          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,11,26,0.97)_0%,rgba(7,11,26,0.90)_30%,rgba(7,11,26,0.58)_58%,rgba(7,11,26,0.18)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.68)_0%,rgba(2,6,23,0.12)_32%,rgba(7,11,26,0.96)_100%)]" />
        </div>

        <div className="relative mx-auto flex min-h-[56vh] max-w-7xl items-end px-4 pb-8 pt-24 sm:min-h-[60vh] sm:px-6 sm:pb-10 sm:pt-28 lg:min-h-[64vh] lg:px-8 lg:pb-16 lg:pt-32">
          <div className="max-w-full pr-2 sm:max-w-[min(52vw,43rem)]">
            <div className="mb-3 sm:mb-5">
              <Image
                src={program.logo}
                alt={program.title}
                width={360}
                height={140}
                priority
                className="h-auto w-[110px] sm:w-[150px] md:w-[190px] lg:w-[260px]"
              />
            </div>

            <div className="mb-3 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/85 backdrop-blur-md sm:mb-4 sm:text-xs">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: program.accent }}
              />
              {program.day}
            </div>

            <h1 className="max-w-xl font-extrabold leading-tight text-[clamp(2rem,4vw,4.5rem)]">
              {program.title}
            </h1>

            <p className="mt-2 max-w-xl text-[clamp(0.96rem,1.35vw,1.2rem)] leading-7 text-white/80 sm:mt-4">
              {program.description}
            </p>

            <div className="mt-4 space-y-1.5 text-[clamp(0.95rem,1.2vw,1.08rem)] text-white/78 sm:mt-5 sm:space-y-2">
              <p className="hidden md:block">
                <span className="font-semibold text-white">{program.time}</span>
              </p>
              <p className="hidden md:block">{program.host}</p>
              <p className="hidden md:block">{program.mobileMeta}</p>
            </div>

            <div className="relative z-20 mt-5 flex flex-nowrap gap-3 sm:mt-7">
              <Link
                href={`/replays/${slug}`}
                prefetch={false}
                className="relative z-20 inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] sm:px-6"
                style={{ backgroundColor: program.accent }}
              >
                Voir les replays
              </Link>

              <Link
                href="/live"
                className="relative z-20 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15 sm:px-6"
              >
                Voir le direct
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {featuredPost && (
          <div className="mb-16">
            <div className="mb-5 flex items-center gap-4">
              <h2 className="text-2xl font-bold sm:text-3xl">À la une</h2>
              <div
                className="h-[2px] flex-1 rounded-full opacity-60"
                style={{ backgroundColor: program.accent }}
              />
            </div>

            <Link
              href={`/videos/${featuredPost.slug}`}
              className="group block overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] backdrop-blur-sm transition hover:bg-white/[0.06]"
            >
              <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  <img
                    src={getFeaturedImage(featuredPost) || program.imageDesktop}
                    alt={featuredPost.title?.rendered || program.title}
                    loading="eager"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="flex flex-col justify-center p-6 lg:p-10">
                  <h3
                    className="text-xl font-bold leading-tight sm:text-2xl lg:text-[2.2rem]"
                    dangerouslySetInnerHTML={{
                      __html: featuredPost.title?.rendered || "",
                    }}
                  />

                  <p className="mt-4 text-white/72">
                    {stripHtml(featuredPost.excerpt?.rendered || "")}
                  </p>

                  <span className="mt-6 text-white/60">
                    {formatDate(featuredPost.date)}
                  </span>

                  <span className="mt-4 font-semibold">Voir la vidéo →</span>
                </div>
              </div>
            </Link>
          </div>
        )}

        <ProgramSuggestionsCarousel
          accent={program.accent}
          programs={suggestedPrograms}
        />
      </section>
    </main>
  );
}