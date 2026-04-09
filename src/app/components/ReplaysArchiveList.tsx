"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ReplayItem = {
  id: number;
  slug: string;
  link: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
};

type Props = {
  videos: ReplayItem[];
};

export default function ReplaysArchiveList({ videos }: Props) {
  const [visibleCount, setVisibleCount] = useState(10);

  const visibleVideos = useMemo(
    () => videos.slice(0, visibleCount),
    [videos, visibleCount]
  );

  const hasMore = visibleCount < videos.length;

  return (
    <div>
      {videos.length === 0 ? (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-8 text-white/70">
          Aucun replay disponible pour le moment.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleVideos.map((video, index) => (
              <Link
                key={video.id}
                href={`/videos/${video.slug}`}
                className="group overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:bg-white/[0.06]"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-black">
                  <img
                    src={video.image}
                    alt={video.title}
                    loading={index < 5 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                </div>

                <div className="p-3 sm:p-4">
                  <h3
                    className="line-clamp-2 text-sm font-bold leading-snug text-white sm:text-base"
                    dangerouslySetInnerHTML={{ __html: video.title }}
                  />

                  <p className="mt-2 line-clamp-3 text-[12px] leading-5 text-white/62 sm:text-sm">
                    {video.excerpt}
                  </p>

                  <p className="mt-3 text-[11px] text-white/70 sm:text-xs">
                    {video.date}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 10)}
                className="rounded-full border border-white/14 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Voir plus de replays
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}