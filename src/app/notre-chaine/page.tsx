export default function NotreChainePage() {
    return (
      <main className="bg-[#050b14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="/bg-live.jpg"
              alt="Fond L'Intelligent TV"
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
                Notre chaîne
              </div>

              <h1 className="mt-6 max-w-3xl text-[clamp(1.9rem,4.2vw,3.8rem)] font-extrabold leading-[0.96] tracking-tight text-white">
                L’information en continu,
                <span className="block text-white/78 text-[clamp(1.4rem,3.6vw,2rem)] font-bold mt-2">
                  pensée pour le digital
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-[1rem] leading-7 text-white/78 sm:text-[1.08rem] sm:leading-8">
                L’Intelligent.TV est une chaîne d’information en continu qui émet
                24h/24 en streaming. Avec pour ambition de révolutionner le
                concept de web télévision en Côte d’Ivoire, la web télé dont vous
                rêvez vous offre une expérience moderne, fluide et accessible sur
                portable comme sur ordinateur.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/live"
                  className="inline-flex items-center justify-center rounded-full bg-[#d91f26] px-6 py-3 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(217,31,38,0.35)] transition hover:scale-[1.02] hover:bg-[#ef2a31]"
                >
                  Regarder le direct
                </a>

                <a
                  href="/programmes"
                  className="inline-flex items-center justify-center rounded-full border border-white/18 bg-white/7 px-6 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/12"
                >
                  Découvrir nos programmes
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
            <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-md sm:p-8">
              <div className="mb-4 text-sm font-extrabold uppercase tracking-[0.2em] text-red-400">
                Qui sommes-nous ?
              </div>

              <h2 className="text-[clamp(1.7rem,3vw,2.6rem)] font-extrabold leading-tight text-white">
                Une chaîne conçue pour vivre l’actualité autrement
              </h2>

              <div className="mt-6 space-y-5 text-[1rem] leading-8 text-white/76">
                <p>
                  L’Intelligent.TV propose une approche dynamique de l’information,
                  avec une diffusion continue, une forte réactivité éditoriale et
                  une présence pensée pour les usages numériques.
                </p>

                <p>
                  Notre ambition est d’informer en temps réel, d’analyser les
                  grands sujets, de donner la parole aux acteurs de la société et
                  d’offrir aux publics une lecture claire, moderne et vivante de
                  l’actualité.
                </p>

                <p>
                  À travers nos émissions, nos débats, nos entretiens et nos
                  replays, nous construisons un média accessible, crédible et
                  connecté aux réalités d’aujourd’hui.
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-[30px] border border-white/10 bg-[#0b1320] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-7">
                <div className="text-sm font-extrabold uppercase tracking-[0.2em] text-cyan-300">
                  Notre mission
                </div>
                <p className="mt-4 text-[1rem] leading-8 text-white/78">
                  Offrir une information continue, accessible et exigeante, sur
                  tous les écrans, avec un traitement éditorial moderne et une
                  expérience pensée pour le digital.
                </p>
              </div>

              <div className="rounded-[30px] border border-white/10 bg-[#0b1320] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-7">
                <div className="text-sm font-extrabold uppercase tracking-[0.2em] text-cyan-300">
                  Notre vision
                </div>
                <p className="mt-4 text-[1rem] leading-8 text-white/78">
                  Réinventer la web télévision en Côte d’Ivoire avec une chaîne
                  d’information en continu capable d’allier proximité, innovation
                  et qualité de production.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-18 lg:px-8 lg:pb-24">
          <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,#0b1320_0%,#111b2b_45%,#16101d_100%)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="text-sm font-extrabold uppercase tracking-[0.2em] text-red-400">
                Ce qui nous définit
              </div>

              <h2 className="mt-4 text-[clamp(1.7rem,3vw,2.6rem)] font-extrabold leading-tight text-white">
                Une expérience TV pensée pour le mobile, l’ordinateur et le temps réel
              </h2>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: "Diffusion continue",
                  text: "Une chaîne disponible 24h/24 en streaming pour suivre l’actualité à tout moment.",
                },
                {
                  title: "Accès multi-écrans",
                  text: "Une expérience fluide sur mobile, tablette et ordinateur.",
                },
                {
                  title: "Programmes variés",
                  text: "Débats, entretiens, analyses, émissions d’actualité et contenus replay.",
                },
                {
                  title: "Vision digitale",
                  text: "Un média pensé dès le départ pour les usages numériques et les nouveaux publics.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm"
                >
                  <h3 className="text-lg font-extrabold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/72">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }