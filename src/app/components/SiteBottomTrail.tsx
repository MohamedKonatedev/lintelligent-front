"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type VideoBreadcrumbData = {
  programLabel: string | null;
  programHref: string | null;
  title: string | null;
};

function toTitleCase(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getLabel(segment: string, fullPath: string) {
  const map: Record<string, string> = {
    live: "En direct",
    replays: "Replays",
    programmes: "Nos programmes",
    "grille-programmes": "Grille des programmes",
    "notre-chaine": "Notre chaîne",
    contact: "Contact",
    "mentions-legales": "Mentions légales",
    "politique-confidentialite": "Confidentialité",
    videos: "Vidéos",
  };

  if (fullPath.startsWith("/programmes/") && segment !== "programmes") {
    return toTitleCase(segment);
  }

  return map[segment] || toTitleCase(segment);
}

export default function SiteBottomTrail() {
  const pathname = usePathname();
  const [videoData, setVideoData] = useState<VideoBreadcrumbData | null>(null);

  useEffect(() => {
    const loadVideoBreadcrumb = async () => {
      if (!pathname?.startsWith("/videos/")) {
        setVideoData(null);
        return;
      }

      const slug = pathname.split("/")[2];
      if (!slug) {
        setVideoData(null);
        return;
      }

      try {
        const res = await fetch(`/api/video-breadcrumb?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        setVideoData(data);
      } catch (error) {
        console.error(error);
        setVideoData(null);
      }
    };

    loadVideoBreadcrumb();
  }, [pathname]);

  const items = useMemo(() => {
    if (!pathname || pathname === "/") return [];

    if (pathname.startsWith("/videos/")) {
      const slug = pathname.split("/")[2];

      return [
        { label: "Accueil", href: "/" },
        {
          label: videoData?.programLabel || "Vidéo",
          href: videoData?.programHref || undefined,
        },
        {
          label: videoData?.title || toTitleCase(slug || "video"),
        },
      ];
    }

    const segments = pathname.split("/").filter(Boolean);

    return [
      { label: "Accueil", href: "/" },
      ...segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        return {
          label: getLabel(segment, pathname),
          href,
        };
      }),
    ];
  }, [pathname, videoData]);

  if (!pathname || pathname === "/") return null;

  return (
    <section className="bg-[#050914] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <img
            src="/home/IAtv-logo.png"
            alt="L'Intelligent TV"
            loading="lazy"
            decoding="async"
            className="h-6 w-auto object-contain"
          />
        </div>
      </div>

      <div className="h-px w-full bg-white/10" />

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav aria-label="Fil d’Ariane">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-white/65">
            {items.map((item, index) => {
              const isLast = index === items.length - 1;

              return (
                <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                  {index > 0 && <span className="text-white/30">/</span>}

                  {item.href && !isLast ? (
                    <Link href={item.href} className="transition hover:text-white">
                      {item.label}
                    </Link>
                  ) : (
                    <span className={isLast ? "text-white" : ""}>{item.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="h-px w-full bg-white/10" />
    </section>
  );
}