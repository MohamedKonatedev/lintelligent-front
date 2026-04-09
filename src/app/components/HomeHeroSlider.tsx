"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Slide = {
  title: string;
  day: string;
  time: string;
  host: string;
  mobileMeta: string;
  href: string;
  logo: string;
  imageDesktop: string;
  imageMobile: string;
  accent: string;
  logoD: string;
  logoT: string;
  logoM: string;
};

const slides: Slide[] = [
  {
    title: "Les Entretiens",
    day: "TOUS LES MERCREDIS",
    time: "18:00 GMT",
    host: "avec Ibrahim Khalil KONE",
    mobileMeta: "Tous les mercredis à 18h00",
    href: "/programmes/les-entretiens",
    logo: "/home/logo-emission-1.png",
    imageDesktop: "/home/slide-1.png",
    imageMobile: "/home/slide-1mobile.png",
    accent: "#1fb7cc",
    logoD: "240px",
    logoT: "150px",
    logoM: "150px",
  },
  {
    title: "Le Débat",
    day: "TOUS LES JEUDIS",
    time: "18:00 GMT",
    host: "avec Ibrahim Khalil KONE",
    mobileMeta: "Tous les jeudis à 18h00",
    href: "/programmes/le-debat",
    logo: "/home/logo-emission-2.png",
    imageDesktop: "/home/slide-2.png",
    imageMobile: "/home/slide-2mobile.png",
    accent: "#1fc423",
    logoD: "295px",
    logoT: "188px",
    logoM: "92px",
  },
  {
    title: "À vous la parole",
    day: "TOUS LES MARDIS",
    time: "18:00 GMT",
    host: "avec Ange KOUADIO",
    mobileMeta: "Tous les mardis à 18h00",
    href: "/programmes/a-vous-la-parole",
    logo: "/home/logo-emission-3.png",
    imageDesktop: "/home/slide-3.png",
    imageMobile: "/home/slide-3mobile.png",
    accent: "#e21a23",
    logoD: "360px",
    logoT: "240px",
    logoM: "108px",
  },
  {
    title: "L'Invité",
    day: "TOUS LES MARDIS",
    time: "10:30 GMT",
    host: "avec Ange KOUADIO",
    mobileMeta: "Tous les mardis à 10h30",
    href: "/programmes/linvite",
    logo: "/home/logo-emission-4.png",
    imageDesktop: "/home/slide-4.png",
    imageMobile: "/home/slide-4mobile.png",
    accent: "#d9a11a",
    logoD: "350px",
    logoT: "230px",
    logoM: "130px",
  },
  {
    title: "La Quotidienne du Sport",
    day: "TOUS LES JOURS",
    time: "19:00 GMT",
    host: "avec Ange KOUADIO",
    mobileMeta: "Tous les jours à 19h00",
    href: "/programmes/la-quotidienne-du-sport",
    logo: "/home/logo-emission-5.png",
    imageDesktop: "/home/slide-5.png",
    imageMobile: "/home/slide-5mobile.png",
    accent: "#2b8cff",
    logoD: "345px",
    logoT: "225px",
    logoM: "150px",
  },
];

export default function HomeHeroSlider() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const changeSlide = (nextIndex: number) => {
    if (nextIndex === current || animating) return;
    setAnimating(true);
    setCurrent(nextIndex);
    window.setTimeout(() => setAnimating(false), 850);
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setAnimating(true);
      setCurrent((prev) => (prev + 1) % slides.length);
      window.setTimeout(() => setAnimating(false), 850);
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const prev = () => changeSlide((current - 1 + slides.length) % slides.length);
  const next = () => changeSlide((current + 1) % slides.length);

  return (
    <section className="pt-0">
      <div className="itv-hero-slider nci-style">
        <div className="itv-slides">
          {slides.map((slide, index) => (
            <article
              key={slide.title}
              className={`itv-slide ${index === current ? "is-active" : ""} ${
                animating && index === current ? "is-reveal" : ""
              }`}
              style={
                {
                  "--accent": slide.accent,
                  "--logo-d": slide.logoD,
                  "--logo-t": slide.logoT,
                  "--logo-m": slide.logoM,
                } as React.CSSProperties
              }
            >
              <div className="itv-poster">
                <picture className="itv-poster__media">
                  <source
                    media="(max-width: 767px)"
                    srcSet={slide.imageMobile}
                  />
                  <img
                    src={slide.imageDesktop}
                    alt={slide.title}
                    loading={index === current ? "eager" : "lazy"}
                    decoding="async"
                  />
                </picture>

                <div className="itv-poster__overlay" />
                <div className="itv-strip-reveal" />

                <div className="itv-panel">
                  <div className="itv-panel__inner">
                    <img
                      className="itv-slide__logo"
                      src={slide.logo}
                      alt={slide.title}
                      loading={index === current ? "eager" : "lazy"}
                      decoding="async"
                    />

                    <div className="itv-schedule">
                      <div className="itv-schedule__day">{slide.day}</div>
                      <div className="itv-schedule__row">
                        <div className="itv-schedule__time">
                          {slide.time.split(" ")[0]} <span>GMT</span>
                        </div>
                        <div className="itv-schedule__host">{slide.host}</div>
                      </div>
                    </div>

                    <p className="itv-mobile-meta">{slide.mobileMeta}</p>

                    <Link href={slide.href} className="itv-btn">
                      Voir l&apos;émission
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <button
          className="itv-nav itv-nav--prev"
          type="button"
          aria-label="Slide précédente"
          onClick={prev}
        >
          &#10094;
        </button>

        <button
          className="itv-nav itv-nav--next"
          type="button"
          aria-label="Slide suivante"
          onClick={next}
        >
          &#10095;
        </button>

        <div className="itv-dots" aria-label="Navigation du slider">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              className={`itv-dot ${index === current ? "is-active" : ""}`}
              aria-label={`Aller à la slide ${index + 1}`}
              onClick={() => changeSlide(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}