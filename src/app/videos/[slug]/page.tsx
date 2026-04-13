import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/app/components/SiteHeader";
import ShareButton from "@/app/components/ShareButton";
import {
  getAllVideos,
  getReplayCardImage,
  getVideoBySlug,
  stripHtml,
} from "@/lib/wordpress";
import { buildVideoObjectJsonLd } from "@/lib/video-schema";
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

const frLongDate: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "long",
  year: "numeric",
};

/** ACF « date diffusion » : souvent YYYYMMDD en API alors que l’admin affiche jj/mm/aaaa. */
function formatDiffusionDate(raw: unknown): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";

  if (/^\d{8}$/.test(s)) {
    const y = s.slice(0, 4);
    const m = s.slice(4, 6);
    const d = s.slice(6, 8);
    const dt = new Date(`${y}-${m}-${d}T12:00:00`);
    if (!Number.isNaN(dt.getTime())) {
      return new Intl.DateTimeFormat("fr-FR", frLongDate).format(dt);
    }
  }

  const dmY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (dmY) {
    const dd = Number(dmY[1]);
    const mm = Number(dmY[2]);
    const yyyy = Number(dmY[3]);
    const dt = new Date(yyyy, mm - 1, dd, 12, 0, 0);
    if (!Number.isNaN(dt.getTime())) {
      return new Intl.DateTimeFormat("fr-FR", frLongDate).format(dt);
    }
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("fr-FR", frLongDate).format(parsed);
  }

  return s;
}

function hasRenderableContent(html: string | undefined): boolean {
  if (!html) return false;
  return stripHtml(html).trim().length > 0;
}

/** Champs ACF possibles pour un chapeau (à créer dans le CMS si besoin). */
function pickAcfShortDescription(acf: Record<string, unknown>): string | null {
  const keys = [
    "description_courte",
    "resume",
    "chapo",
    "sous_titre",
    "description_video",
  ];
  for (const key of keys) {
    const v = acf[key];
    if (v == null) continue;
    const s = typeof v === "string" ? v.trim() : String(v).trim();
    if (s) return s;
  }
  return null;
}

function looksLikeHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s);
}

function acfText(v: unknown): string {
  if (v == null || v === false) return "";
  return typeof v === "string" ? v.trim() : String(v).trim();
}

/** Évite de dupliquer l’auto-résumé WordPress (souvent = début du contenu). */
function excerptIsDistinctFromContent(
  excerptHtml: string | undefined,
  contentHtml: string | undefined
): boolean {
  const e = stripHtml(excerptHtml || "").replace(/\s+/g, " ").trim().toLowerCase();
  const c = stripHtml(contentHtml || "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!e || !c) return !!e;
  const prefix = e.slice(0, Math.min(80, e.length));
  return !c.startsWith(prefix);
}

function getYoutubeEmbed(url: string) {
  const id = extractYoutubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

function acfVideoUrlForMeta(acf: Record<string, unknown>): string {
  return (
    acfText(acf.lien_video) ||
    acfText(acf.video_url) ||
    acfText(acf.youtube_url) ||
    acfText(acf.url_video) ||
    ""
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const video = await getVideoBySlug(slug);

  if (!video) {
    return {
      title: "Vidéo introuvable | L'Intelligent TV",
    };
  }

  const acf = (video as { acf?: Record<string, unknown> }).acf ?? {};
  const acfShort = pickAcfShortDescription(acf);
  const metaDesc =
    stripHtml(acfShort || "") ||
    stripHtml(video.excerpt?.rendered || "") ||
    stripHtml(video.content?.rendered || "").slice(0, 160);

  const titlePlain = stripHtml(video.title?.rendered || "Vidéo");
  const ytId = extractYoutubeVideoId(acfVideoUrlForMeta(acf));
  const ogImage = ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : undefined;

  return {
    title: `${titlePlain} | L'Intelligent TV`,
    description: metaDesc,
    alternates: {
      canonical: `/videos/${slug}`,
    },
    openGraph: {
      title: `${titlePlain} | L'Intelligent TV`,
      description: metaDesc,
      url: `/videos/${slug}`,
      type: "video.other",
      ...(ogImage && {
        images: [{ url: ogImage, width: 1280, height: 720, alt: titlePlain }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: `${titlePlain} | L'Intelligent TV`,
      description: metaDesc,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default async function VideoPage({ params }: PageProps) {
  const { slug } = await params;

  const [video, videos] = await Promise.all([
    getVideoBySlug(slug),
    getAllVideos(100),
  ]);

  if (!video) {
    notFound();
  }

  const acf = (video as { acf?: Record<string, unknown> }).acf ?? {};
  const acfShortDescription = pickAcfShortDescription(acf);
  const excerptHtml = video.excerpt?.rendered;
  const contentHtml = video.content?.rendered;
  const showWpExcerptAsChapo =
    !acfShortDescription &&
    hasRenderableContent(excerptHtml) &&
    (!hasRenderableContent(contentHtml) ||
      excerptIsDistinctFromContent(excerptHtml, contentHtml));

  const excerptFallbackPlain =
    !hasRenderableContent(contentHtml) &&
    !showWpExcerptAsChapo &&
    hasRenderableContent(excerptHtml);

  const hasExcerptUnderTitle =
    !!acfShortDescription || (showWpExcerptAsChapo && !!excerptHtml) || excerptFallbackPlain;

  const videoUrl =
    acfText(acf.lien_video) ||
    acfText(acf.video_url) ||
    acfText(acf.youtube_url) ||
    acfText(acf.url_video) ||
    "";

  const embedUrl = getYoutubeEmbed(videoUrl);

  const relatedVideos = videos
    .filter((v: any) => v.id !== video.id)
    .slice(0, 8);

  const videoObjectJsonLd = buildVideoObjectJsonLd({
    video,
    slug,
    videoSourceUrl: videoUrl,
    acfShortPlain: acfShortDescription,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(videoObjectJsonLd),
        }}
      />
      <main className="min-h-screen bg-[#070b1a] text-white">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#08101f_0%,#0b1223_45%,#10192f_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(227,25,35,0.10),transparent_28%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(33,87,255,0.12),transparent_26%)]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-28 sm:px-6 lg:px-8 lg:pb-14 lg:pt-32">
          <div className="mx-auto max-w-[1280px]">

            <div className="flex min-w-0 flex-col items-stretch gap-6 lg:flex-row lg:items-center lg:gap-10">

              <div className="flex w-full min-w-0 justify-center lg:w-[58%] lg:justify-center xl:w-[60%]">

                <div className="w-full max-w-[760px] xl:max-w-[820px]">

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

              <aside className="w-full min-w-0 lg:w-[42%] xl:w-[40%]">

                <div className="video-aside-text mt-2 w-full min-w-0 rounded-[22px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm sm:mt-3 sm:p-5 lg:mt-0 lg:p-6">

                  <h1
                    className="block w-full max-w-full break-words text-left text-[clamp(0.8125rem,2.4vw+0.45rem,1.1875rem)] font-extrabold leading-[1.18] text-white sm:leading-[1.15] lg:leading-tight xl:text-[clamp(0.875rem,1.5vw+0.5rem,1.25rem)] [&_*]:max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: video.title?.rendered || "",
                    }}
                  />

                  {hasExcerptUnderTitle && (
                    <div className="mt-3 space-y-2.5 sm:mt-3.5 sm:space-y-3">
                      {acfShortDescription && (
                        <div className="excerpt-chapo max-w-full border-l-2 border-red-500/70 pl-2.5 text-[0.6875rem] leading-snug text-white/78 sm:pl-3 sm:text-[0.75rem] md:text-xs [&_a]:break-words [&_a]:text-red-400 [&_a]:underline">
                          {looksLikeHtml(acfShortDescription) ? (
                            <div
                              className="break-words [&_p]:my-0 [&_p]:mb-1 [&_p]:break-words [&_p]:leading-snug [&_p:last-child]:mb-0 [&_p]:text-inherit [&_p]:text-white/78"
                              dangerouslySetInnerHTML={{
                                __html: acfShortDescription,
                              }}
                            />
                          ) : (
                            <p className="m-0 break-words leading-snug">{acfShortDescription}</p>
                          )}
                        </div>
                      )}

                      {showWpExcerptAsChapo && excerptHtml && (
                        <div className="excerpt-chapo max-w-full border-l-2 border-red-500/70 pl-2.5 text-[0.6875rem] leading-snug text-white/78 sm:pl-3 sm:text-[0.75rem] md:text-xs [&_a]:break-words [&_a]:text-red-400 [&_a]:underline">
                          {looksLikeHtml(excerptHtml) ? (
                            <div
                              className="break-words [&_p]:my-0 [&_p]:mb-1 [&_p]:break-words [&_p]:leading-snug [&_p:last-child]:mb-0 [&_p]:text-inherit [&_p]:text-white/78"
                              dangerouslySetInnerHTML={{ __html: excerptHtml }}
                            />
                          ) : (
                            <p className="m-0 break-words leading-snug">{stripHtml(excerptHtml)}</p>
                          )}
                        </div>
                      )}

                      {excerptFallbackPlain && (
                        <p className="m-0 max-w-full border-l-2 border-red-500/70 pl-2.5 break-words text-[0.6875rem] leading-snug text-white/72 sm:pl-3 sm:text-[0.75rem] md:text-xs">
                          {stripHtml(excerptHtml || "")}
                        </p>
                      )}
                    </div>
                  )}

                  <div
                    className={
                      hasExcerptUnderTitle
                        ? "mt-4 space-y-1.5 border-t border-white/10 pt-4 text-xs leading-snug text-white/75 sm:mt-5 sm:space-y-2 sm:text-[0.8125rem] md:text-sm"
                        : "mt-4 space-y-1.5 text-xs leading-snug text-white/75 sm:mt-5 sm:space-y-2 sm:text-[0.8125rem] md:text-sm"
                    }
                  >
                    <p>
                      <span className="font-semibold text-white">
                        {acfText(acf.date_diffusion) ? "Diffusion :" : "Publiée le :"}
                      </span>{" "}
                      {acfText(acf.date_diffusion)
                        ? formatDiffusionDate(acf.date_diffusion)
                        : formatDate(video.date)}
                    </p>

                    {acfText(acf.presentateur) && (
                      <p>
                        <span className="font-semibold text-white">Présentateur :</span>{" "}
                        {acfText(acf.presentateur)}
                      </p>
                    )}

                    {acfText(acf.duree) && (
                      <p>
                        <span className="font-semibold text-white">Durée :</span>{" "}
                        {acfText(acf.duree)}
                      </p>
                    )}
                  </div>

                  {hasRenderableContent(contentHtml) && (
                    <div
                      className="video-description mt-4 max-w-full break-words border-t border-white/10 pt-4 text-[0.75rem] leading-snug text-white/80 sm:mt-5 sm:text-[0.8125rem] md:text-sm md:leading-relaxed [&_a]:break-words [&_a]:text-red-400 [&_a]:underline [&_img]:h-auto [&_img]:max-w-full [&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:leading-snug [&_p]:text-inherit [&_ul]:my-1 [&_ul]:list-inside [&_ul]:pl-1"
                      dangerouslySetInnerHTML={{
                        __html: contentHtml ?? "",
                      }}
                    />
                  )}



                  <div className="mt-8 flex flex-wrap gap-3">

                    <ShareButton

                      title={stripHtml(video.title?.rendered || "Vidéo")}

                      text="Regarde cette vidéo sur L'Intelligent TV"

                    />

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
                  src={getReplayCardImage(item) || "/programs/les-entretiens-home-square.jpg"}
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
    </>
  );
}