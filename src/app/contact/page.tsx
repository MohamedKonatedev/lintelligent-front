import SocialLinksGrid from "@/app/components/SocialLinksGrid";

export default function ContactPage() {
  return (
    <main className="bg-[#050b14] text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/bg-live.jpg"
            alt="Fond contact"
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,11,20,0.92)_0%,rgba(5,11,20,0.82)_38%,rgba(80,0,18,0.48)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,31,38,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_26%)]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-20 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8 lg:pb-24 lg:pt-28">
          <div className="max-w-4xl">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[0.72rem] font-extrabold uppercase tracking-[0.22em] text-white/85 backdrop-blur-md">
              Contact
            </div>

            <h1 className="mt-6 max-w-3xl text-[clamp(1.8rem,4.2vw,3.7rem)] font-extrabold leading-[0.96] tracking-tight text-white">
              Restons en <span className="text-white/78">contact</span>
            </h1>

            <p className="mt-6 max-w-2xl text-[1rem] leading-7 text-white/78 sm:text-[1.08rem] sm:leading-8">
              Une question, une proposition, un partenariat ou une demande
              d’information ? Contactez l’équipe de L’Intelligent TV.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-24">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-md sm:p-8">
            <div className="text-sm font-extrabold uppercase tracking-[0.2em] text-red-400">
              Nous écrire
            </div>

            <h2 className="mt-4 text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold leading-tight text-white">
              Nous sommes disponibles pour échanger avec vous
            </h2>

            <div className="mt-8 space-y-6">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
                <div className="text-sm font-extrabold uppercase tracking-[0.15em] text-cyan-300">
                  Email
                </div>
                <p className="mt-3 text-base text-white/82">contact@lintelligent.tv</p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
                <div className="text-sm font-extrabold uppercase tracking-[0.15em] text-cyan-300">
                  Téléphone
                </div>
                <p className="mt-3 text-base text-white/82">À compléter</p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
                <div className="text-sm font-extrabold uppercase tracking-[0.15em] text-cyan-300">
                  Adresse
                </div>
                <p className="mt-3 text-base leading-7 text-white/82">À compléter</p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#0b1320] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-8">
            <div className="text-sm font-extrabold uppercase tracking-[0.2em] text-red-400">
              Informations
            </div>

            <h2 className="mt-4 text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold leading-tight text-white">
              Pour toute demande éditoriale, technique ou commerciale
            </h2>

            <div className="mt-6 space-y-5 text-[1rem] leading-8 text-white/76">
              <p>
                Vous pouvez nous contacter pour toute question liée à nos
                programmes, à nos contenus, à un partenariat média ou à une
                demande d’information générale.
              </p>

              <p>
                Nous vous répondrons dans les meilleurs délais via les canaux
                officiels de L’Intelligent TV.
              </p>
            </div>

            <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="text-sm font-extrabold uppercase tracking-[0.15em] text-cyan-300">
                Réseaux sociaux
              </div>

              <p className="mt-3 text-sm leading-7 text-white/72">
                Suivez L’Intelligent TV sur toutes ses plateformes.
              </p>

              <div className="mt-5">
                <SocialLinksGrid linkClassName="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-white transition-all hover:border-red-500 hover:bg-red-600/90" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
