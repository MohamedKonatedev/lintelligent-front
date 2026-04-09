import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import { PROGRAMS } from "./programs";

export const metadata = {
  title: "Nos programmes | L'Intelligent TV",
  description: "Découvrez les programmes de L'Intelligent TV.",
};

export default function ProgrammesPage() {
  return (
    <main className="min-h-screen bg-[#070b1a] text-white">

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#070b1a_0%,#0b1223_45%,#111a33_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(227,25,35,0.18),transparent_35%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(33,87,255,0.14),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-28 sm:px-6 lg:px-8 lg:pb-16 lg:pt-36">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Nos programmes
            </h1>

            <p className="mt-5 text-base leading-7 text-white/70">
              Découvrez toutes nos émissions : débats, entretiens, analyses et
              programmes exclusifs.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 pt-24 sm:px-6 sm:pt-28 lg:px-8 lg:pb-20 lg:pt-32">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {PROGRAMS.map((program, index) => (
            <Link
              key={program.slug}
              href={`/programmes/${program.slug}`}
              className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="mx-auto w-[94%] pt-4 sm:w-[84%] sm:pt-7">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[24px]">
                  <Image
                    src={program.imageMobile}
                    alt={program.title}
                    fill
                    priority={index < 4}
                    sizes="(max-width: 1279px) 50vw, 33vw"
                    className="object-cover object-center transition duration-700 group-hover:scale-[1.04] group-hover:grayscale"
                  />

                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,11,26,0.04)_0%,rgba(7,11,26,0.14)_28%,rgba(7,11,26,0.45)_62%,rgba(7,11,26,0.95)_100%)]" />

                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <Image
                      src={program.logo}
                      alt={program.title}
                      width={160}
                      height={70}
                      className="mb-2 h-auto w-[60px] animate-[floatLogo_4s_ease-in-out_infinite] sm:w-[80px] lg:w-[96px]"
                    />

                    <h2 className="text-[15px] font-extrabold leading-tight sm:text-2xl">
                      {program.title}
                    </h2>

                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                      {program.day}
                    </p>

                    <p className="mt-1 text-sm font-semibold leading-6 text-white/95">
                      {program.time}
                    </p>

                    <p className="text-sm leading-6 text-white/72">
                      {program.host}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-5 sm:p-5 sm:pt-6">
                <p className="line-clamp-3 text-sm leading-7 text-white/70 sm:text-base">
                  {program.description}
                </p>

                <div className="mt-5">
                  <span
                    className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white transition duration-300 group-hover:scale-[1.02]"
                    style={{ backgroundColor: program.accent }}
                  >
                    Voir l’émission
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}