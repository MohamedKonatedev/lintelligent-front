"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PROGRAMS } from "@/app/programmes/programs";

const slides = PROGRAMS.map((p) => ({
  title: p.title,
  day: p.day,
  time: p.time,
  host: p.host,
  mobileMeta: p.mobileMeta,
  href: p.href,
  logo: p.logo,
  imageDesktop: p.imageDesktop,
  imageMobile: p.imageMobile,
  accent: p.accent,
  logoD: p.logoD,
  logoT: p.logoT,
  logoM: p.logoM,
}));

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
                    decoding={index === current ? "sync" : "async"}
                    fetchPriority={index === current ? "high" : "low"}
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
                      decoding={index === current ? "sync" : "async"}
                      fetchPriority={index === current ? "high" : "low"}
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