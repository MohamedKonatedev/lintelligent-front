import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/app/components/SiteHeader";
import ShareButton from "@/app/components/ShareButton";
import {
  getAllVideos,
  getReplayCardImage,
  stripHtml,
} from "@/lib/wordpress";
import { extractYoutubeVideoId } from "@/lib/youtube-thumbnail";

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

function getYoutubeEmbed(url: string) {
  const id = extractYoutubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const videos = await getAllVideos(100);
  const video = videos.find((v: any) => v.slug === slug);

  if (!video) {
    return {
      title: "Vidéo introuvable | L'Intelligent TV",
    };
  }

  return {
    title: `${stripHtml(video.title?.rendered || "Vidéo")} | L'Intelligent TV`,
    description: stripHtml(video.excerpt?.rendered || ""),
  };
}

export default async function VideoPage({ params }: PageProps) {
  const { slug } = await params;

  const videos = await getAllVideos(100);
  const video = videos.find((v: any) => v.slug === slug);

  if (!video) {
    notFound();
  }

  const acf = (video as any).acf ?? {};

  const videoUrl =
    acf.lien_video ||
    acf.video_url ||
    acf.youtube_url ||
    acf.url_video ||
    "";

  const embedUrl = getYoutubeEmbed(videoUrl);

  const relatedVideos = videos
    .filter((v: any) => v.id !== video.id)
    .slice(0, 8);

  return (
    <main className="min-h-screen bg-[#070b1a] text-white">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#08101f_0%,#0b1223_45%,#10192f_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(227,25,35,0.10),transparent_28%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(33,87,255,0.12),transparent_26%)]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-28 sm:px-6 lg:px-8 lg:pb-14 lg:pt-32">
          <div className="mx-auto max-w-[1280px]">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">

              <div className="w-full lg:w-[58%] xl:w-[60%]">

                <div className="lg:max-w-[760px] xl:max-w-[820px]">

                  <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.35)]">

                    <div className="relative aspect-video">

                      {embedUrl ? (

                        <iframe

                          src={`${embedUrl}?modestbranding=1&rel=0`}

                          className="absolute inset-0 h-full w-full"

                          allow="autoplay; encrypted-media; picture-in-picture"

                          allowFullScreen

                        />

                      ) : (

                        <div className="flex h-full items-center justify-center text-white/50">

                          Vidéo non disponible

                        </div>

                      )}

                    </div>

                  </div>

                </div>

              </div>

              <aside className="w-full lg:w-[42%] xl:w-[40%]">

                <div className="mt-2 rounded-[22px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:mt-3 sm:p-6 lg:mt-0">

                  <h1

                    className="text-2xl font-extrabold leading-tight sm:text-3xl"

                    dangerouslySetInnerHTML={{

                      __html: video.title?.rendered || "",

                    }}

                  />



                  <div className="mt-6 space-y-3 text-sm text-white/72 sm:text-base">

                    <p>

                      <span className="font-semibold text-white">Date :</span>{" "}

                      {formatDate(video.date)}

                    </p>



                    {acf.presentateur && (

                      <p>

                        <span className="font-semibold text-white">Présentateur :</span>{" "}

                        {acf.presentateur}

                      </p>

                    )}



                    {acf.duree && (

                      <p>

                        <span className="font-semibold text-white">Durée :</span>{" "}

                        {acf.duree}

                      </p>

                    )}



                    {acf.date_diffusion && (

                      <p>

                        <span className="font-semibold text-white">Diffusion :</span>{" "}

                        {acf.date_diffusion}

                      </p>

                    )}

                  </div>



                  <p className="mt-6 text-sm leading-7 text-white/68 sm:text-base">

                    {stripHtml(video.excerpt?.rendered || "")}

                  </p>



                  <div className="mt-8 flex flex-wrap gap-3">

                    <ShareButton

                      title={stripHtml(video.title?.rendered || "Vidéo")}

                      text="Regarde cette vidéo sur L'Intelligent TV"

                    />

                  </div>



                  <div className="mt-6">

                    <Link

                      href="/replays"

                      className="text-sm text-white/50 transition hover:text-white"

                    >

                      ← Retour aux replays

                    </Link>

                  </div>

                </div>

              </aside>

            </div>

          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <h2 className="text-2xl font-bold sm:text-3xl">Autres replays</h2>
          <div className="h-[2px] flex-1 rounded-full bg-red-500/70" />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {relatedVideos.map((item: any, relatedIndex) => (
            <Link
              key={item.id}
              href={`/videos/${item.slug}`}
              className="group overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:bg-white/[0.06]"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-black">
                <img
                  src={getReplayCardImage(item) || "/home/slide-1.png"}
                  alt={stripHtml(item.title?.rendered || "")}
                  loading={relatedIndex < 4 ? "eager" : "lazy"}
                  decoding="async"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
              </div>

              <div className="p-3">
                <h3
                  className="line-clamp-2 text-sm font-bold"
                  dangerouslySetInnerHTML={{
                    __html: item.title?.rendered || "",
                  }}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}