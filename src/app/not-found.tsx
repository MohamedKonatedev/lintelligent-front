import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,#04070f_0%,#09111f_40%,#101a31_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(227,25,35,0.18),transparent_30%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(33,87,255,0.14),transparent_34%)]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:42px_42px]" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-4 pb-16 pt-32 sm:px-6 sm:pt-36 lg:px-8 lg:pt-40">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-10 lg:p-12">
            <div className="inline-flex items-center rounded-full border border-red-500/25 bg-red-500/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.28em] text-red-300 sm:text-xs">
              Erreur 404
            </div>

            <h1 className="mt-5 text-[clamp(2.1rem,4vw,3.6rem)] font-extrabold leading-[1.08] tracking-tight text-white">
              Signal perdu.
              <span className="block text-white/72 text-[clamp(1.4rem,2.8vw,2.1rem)]">
                Cette page est introuvable.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-[1.13rem] leading-8 text-white/72 sm:text-[1.25rem] sm:leading-9">
              La page que vous cherchez n’est plus disponible, a été déplacée
              ou l’adresse saisie est incorrecte. Revenez à la diffusion
              principale ou explorez nos contenus.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-red-500"
              >
                Retour à l’accueil
              </Link>

              <Link
                href="/live"
                className="inline-flex items-center justify-center rounded-full border border-white/16 bg-white/[0.05] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/[0.09]"
              >
                Aller au direct
              </Link>

              <Link
                href="/replays"
                className="inline-flex items-center justify-center rounded-full border border-white/16 bg-white/[0.05] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/[0.09]"
              >
                Voir les replays
              </Link>

              <Link
                href="/programmes"
                className="inline-flex items-center justify-center rounded-full border border-white/16 bg-white/[0.05] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/[0.09]"
              >
                Nos programmes
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_100%)] shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-md">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(227,25,35,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(33,87,255,0.18),transparent_34%)]" />

            <div className="relative flex min-h-[360px] items-center justify-center p-8 sm:min-h-[430px] sm:p-10 lg:min-h-[520px]">
              <div className="relative flex h-[160px] w-[160px] items-center justify-center rounded-full border border-white/10 bg-white/[0.05] sm:h-[200px] sm:w-[200px] lg:h-[230px] lg:w-[230px]">
                <div className="absolute inset-[12%] rounded-full border border-white/8" />
                <div className="absolute inset-[24%] rounded-full border border-white/8" />
                <div className="absolute inset-[36%] rounded-full border border-red-500/25" />

                <div className="text-center">
                  <div className="text-[2.4rem] font-extrabold leading-none text-white sm:text-[3rem] lg:text-[3.4rem]">
                    404
                  </div>
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.34em] text-white/55 sm:text-xs">
                    L&apos;Intelligent TV
                  </div>
                </div>
              </div>

              <div className="absolute left-[10%] top-[16%] h-3 w-3 rounded-full bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.8)]" />
              <div className="absolute right-[16%] top-[24%] h-2.5 w-2.5 rounded-full bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.75)]" />
              <div className="absolute bottom-[18%] left-[18%] h-2 w-2 rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.45)]" />
              <div className="absolute bottom-[14%] right-[14%] h-3 w-3 rounded-full bg-red-400/80 shadow-[0_0_20px_rgba(248,113,113,0.65)]" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}