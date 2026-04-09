"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type ReplayVideo = {
  id: number;
  slug: string;
  link: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
  categories: number[];
};

type ReplayCategory = {
  slug: string;
  id: number | null;
  title: string;
  accent: string;
};

type Props = {
  videos: ReplayVideo[];
  categories: ReplayCategory[];
};

const FILTER_STORAGE_KEY = "replays-active-filter";

export default function ReplaysCatalog({ videos, categories }: Props) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const tabsRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem(FILTER_STORAGE_KEY)
        : null;

    if (
      saved &&
      (saved === "all" || categories.some((cat) => cat.slug === saved))
    ) {
      setActiveFilter(saved);
    }
  }, [categories]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FILTER_STORAGE_KEY, activeFilter);
    }
  }, [activeFilter]);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollTo({
        left: 0,
        behavior: "smooth",
      });
    }
  }, [activeFilter]);

  const selectedCategory = useMemo(() => {
    if (activeFilter === "all") return null;
    return categories.find((cat) => cat.slug === activeFilter) ?? null;
  }, [activeFilter, categories]);

  const filteredVideos = useMemo(() => {
    if (activeFilter === "all") return videos;

    if (!selectedCategory?.id) return [];

    return videos.filter((video) => video.categories.includes(selectedCategory.id!));
  }, [activeFilter, videos, selectedCategory]);

  const carouselVideos = filteredVideos.slice(0, 20);

  const scrollTabs = (direction: "left" | "right") => {
    if (!tabsRef.current) return;
    tabsRef.current.scrollBy({
      left: direction === "left" ? -220 : 220,
      behavior: "smooth",
    });
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const amount =
      window.innerWidth < 640 ? 220 : window.innerWidth < 1024 ? 320 : 420;

    carouselRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div>
      <div className="mb-8">
        <div className="relative">
          <button
            type="button"
            onClick={() => scrollTabs("left")}
            aria-label="Onglets précédents"
            className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-[#0d1427]/85 text-xl text-white backdrop-blur-md transition hover:bg-[#131d35]"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={() => scrollTabs("right")}
            aria-label="Onglets suivants"
            className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-[#0d1427]/85 text-xl text-white backdrop-blur-md transition hover:bg-[#131d35]"
          >
            ›
          </button>

          <div
            ref={tabsRef}
            className="no-scrollbar overflow-x-auto px-12"
          >
            <div className="flex min-w-max gap-3">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  activeFilter === "all"
                    ? "bg-red-600 text-white"
                    : "border border-white/14 bg-white/[0.04] text-white/82 hover:bg-white/[0.08]"
                }`}
              >
                Tout
              </button>

              {categories.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => setActiveFilter(category.slug)}
                  className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    activeFilter === category.slug
                      ? "text-white"
                      : "border border-white/14 bg-white/[0.04] text-white/82 hover:bg-white/[0.08]"
                  }`}
                  style={
                    activeFilter === category.slug
                      ? { backgroundColor: category.accent }
                      : undefined
                  }
                >
                  {category.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {filteredVideos.length === 0 ? (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-8 text-white/70">
          Aucun replay disponible pour ce programme pour le moment.
        </div>
      ) : (
        <>
          <div className="relative">
            <button
              type="button"
              onClick={() => scrollCarousel("left")}
              aria-label="Replays précédents"
              className="absolute left-0 top-[34%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-[#0d1427]/85 text-xl text-white backdrop-blur-md transition hover:bg-[#131d35]"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={() => scrollCarousel("right")}
              aria-label="Replays suivants"
              className="absolute right-0 top-[34%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-[#0d1427]/85 text-xl text-white backdrop-blur-md transition hover:bg-[#131d35]"
            >
              ›
            </button>

            <div
              ref={carouselRef}
              className="no-scrollbar overflow-x-auto px-12"
            >
              <div className="flex min-w-max gap-4 sm:gap-5">
                {carouselVideos.map((video, carouselIndex) => (
                  <Link
                    key={video.id}
                    href={`/videos/${video.slug}`}
                    className="group w-[180px] min-w-[180px] sm:w-[220px] sm:min-w-[220px] lg:w-[260px] lg:min-w-[260px]"
                  >
                    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:bg-white/[0.06]">
                      <div className="relative aspect-[3/4] overflow-hidden bg-black">
                        <img
                          src={video.image}
                          alt={video.title}
                          loading={
                            carouselIndex < 5 ? "eager" : "lazy"
                          }
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                      </div>

                      <div className="p-3 sm:p-4">
                        <h3
                          className="line-clamp-2 text-sm font-bold leading-snug text-white sm:text-base"
                          dangerouslySetInnerHTML={{ __html: video.title }}
                        />

                        <p className="mt-2 text-[11px] text-white/70 sm:text-xs">
                          {video.date}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {activeFilter !== "all" && (
            <div className="mt-8 flex justify-center">
              <Link
                href={`/replays/${activeFilter}`}
                className="rounded-full border border-white/14 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Voir plus de replays
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}