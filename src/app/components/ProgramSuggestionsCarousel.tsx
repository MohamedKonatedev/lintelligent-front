"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type ProgramItem = {
  slug: string;
  title: string;
  day: string;
  time: string;
  host: string;
  image: string;
  fallbackImage: string;
};

type Props = {
  accent: string;
  programs: ProgramItem[];
};

function getOffset(index: number, activeIndex: number, total: number) {
  const raw = index - activeIndex;
  const alt = raw > 0 ? raw - total : raw < 0 ? raw + total : raw;
  return Math.abs(raw) < Math.abs(alt) ? raw : alt;
}

function CarouselCard({
  item,
  offset,
}: {
  item: ProgramItem;
  offset: number;
}) {
  const [src, setSrc] = useState(item.image || item.fallbackImage);

  const isCenter = offset === 0;

  let transformClasses =
    "left-1/2 top-1/2 -translate-y-1/2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]";

  if (offset === 0) {
    transformClasses += " -translate-x-1/2 scale-100 opacity-100 z-30";
  } else if (offset === -1) {
    transformClasses += " -translate-x-[185%] scale-[0.82] opacity-78 z-20";
  } else if (offset === 1) {
    transformClasses += " translate-x-[85%] scale-[0.82] opacity-78 z-20";
  } else if (offset < -1) {
    transformClasses += " -translate-x-[270%] scale-[0.68] opacity-0 z-0";
  } else {
    transformClasses += " translate-x-[170%] scale-[0.68] opacity-0 z-0";
  }

  const widthClasses = isCenter
    ? "w-[44vw] sm:w-[300px] lg:w-[360px]"
    : "w-[23vw] sm:w-[210px] lg:w-[250px]";

  return (
    <Link
      href={`/programmes/${item.slug}`}
      className={`absolute ${transformClasses} ${widthClasses} block`}
    >
      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <div className="relative aspect-[3/4] overflow-hidden">
          <Image
            src={src}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 44vw, 360px"
            className={`object-cover transition duration-700 ${
              isCenter ? "opacity-100" : "opacity-88"
            }`}
            onError={() => {
              if (src !== item.fallbackImage) {
                setSrc(item.fallbackImage);
              }
            }}
          />

          <div
            className={`absolute inset-0 ${
              isCenter
                ? "bg-[linear-gradient(180deg,rgba(7,11,26,0.02)_0%,rgba(7,11,26,0.14)_54%,rgba(7,11,26,0.82)_100%)]"
                : "bg-[linear-gradient(180deg,rgba(7,11,26,0.08)_0%,rgba(7,11,26,0.22)_54%,rgba(7,11,26,0.84)_100%)]"
            }`}
          />

          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 lg:p-5">
            <h3
              className={`font-bold leading-tight text-white drop-shadow ${
                isCenter
                  ? "text-[14px] sm:text-[22px] lg:text-[28px]"
                  : "text-[10px] sm:text-[14px] lg:text-[18px]"
              }`}
            >
              {item.title}
            </h3>
          </div>
        </div>

        <div className={`${isCenter ? "p-4 sm:p-5" : "p-3 sm:p-4"}`}>
          <p
            className={`text-white/72 ${
              isCenter ? "text-[11px] sm:text-sm" : "text-[9px] sm:text-xs"
            }`}
          >
            {item.day}
          </p>
          <p
            className={`mt-1 text-white/65 ${
              isCenter ? "text-[11px] sm:text-sm" : "text-[9px] sm:text-xs"
            }`}
          >
            {item.time}
          </p>
          <p
            className={`mt-1 line-clamp-2 text-white/55 ${
              isCenter ? "text-[11px] sm:text-sm" : "text-[9px] sm:text-xs"
            }`}
          >
            {item.host}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function ProgramSuggestionsCarousel({
  accent,
  programs,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const previous = () => {
    if (programs.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + programs.length) % programs.length);
  };

  const next = () => {
    if (programs.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % programs.length);
  };

  const cards = useMemo(() => {
    return programs.map((item, index) => ({
      ...item,
      offset: getOffset(index, activeIndex, programs.length),
    }));
  }, [programs, activeIndex]);

  return (
    <section className="mt-10 sm:mt-14">
      <div className="mb-6 flex items-center gap-4">
        <h2 className="text-2xl font-bold uppercase sm:text-3xl">
          Voir les autres programmes
        </h2>
        <div
          className="h-[2px] flex-1 rounded-full opacity-60"
          style={{ backgroundColor: accent }}
        />
      </div>

      <div className="relative mx-auto mt-8 max-w-7xl">
        <button
          type="button"
          aria-label="Programme précédent"
          onClick={previous}
          className="absolute left-0 top-1/2 z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#0d1427]/85 text-2xl text-white backdrop-blur-md transition hover:bg-[#131d35] sm:h-11 sm:w-11"
        >
          ‹
        </button>

        <button
          type="button"
          aria-label="Programme suivant"
          onClick={next}
          className="absolute right-0 top-1/2 z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#0d1427]/85 text-2xl text-white backdrop-blur-md transition hover:bg-[#131d35] sm:h-11 sm:w-11"
        >
          ›
        </button>

        <div className="relative h-[420px] sm:h-[520px] md:h-[600px] lg:h-[680px]">
          {cards.map((item) => (
            <CarouselCard
              key={item.slug}
              item={item}
              offset={item.offset}
            />
          ))}
        </div>
      </div>
    </section>
  );
}