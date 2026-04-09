export default function PolitiqueConfidentialitePage() {
    return (
      <main className="bg-[#050b14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="/bg-live.jpg"
              alt="Fond politique de confidentialité"
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
                Protection des données
              </div>
  
              <h1 className="mt-6 max-w-3xl text-[clamp(1.8rem,4.2vw,3.7rem)] font-extrabold leading-[0.96] tracking-tight text-white">
                Politique de
                <span className="block text-white/78">confidentialité</span>
              </h1>
  
              <p className="mt-6 max-w-2xl text-[1rem] leading-7 text-white/78 sm:text-[1.08rem] sm:leading-8">
                Cette politique de confidentialité explique comment
                L&apos;Intelligent TV collecte, utilise et protège les données
                personnelles des utilisateurs de son site.
              </p>
            </div>
          </div>
        </section>
  
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
            <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-md sm:p-8">
              <div className="text-sm font-extrabold uppercase tracking-[0.2em] text-red-400">
                Données collectées
              </div>
  
              <div className="mt-8 space-y-6 text-sm leading-7 text-white/78 sm:text-base">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
                  <h2 className="text-base font-extrabold text-white sm:text-lg">
                    1. Données fournies par l’utilisateur
                  </h2>
                  <p className="mt-3">
                    Lorsque vous contactez L&apos;Intelligent TV, certaines
                    informations peuvent être collectées, notamment votre nom,
                    votre adresse e-mail, votre numéro de téléphone ou tout autre
                    renseignement que vous choisissez de transmettre.
                  </p>
                </div>
  
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
                  <h2 className="text-base font-extrabold text-white sm:text-lg">
                    2. Données techniques
                  </h2>
                  <p className="mt-3">
                    Lors de la navigation sur le site, des données techniques
                    peuvent être automatiquement collectées, telles que l’adresse
                    IP, le type de navigateur, le système d’exploitation, les
                    pages consultées, la durée de visite et certaines données
                    liées aux performances du site.
                  </p>
                </div>
  
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
                  <h2 className="text-base font-extrabold text-white sm:text-lg">
                    3. Cookies
                  </h2>
                  <p className="mt-3">
                    Le site peut utiliser des cookies ou technologies similaires
                    afin d’améliorer l’expérience utilisateur, de mesurer
                    l’audience et d’assurer le bon fonctionnement de certaines
                    fonctionnalités.
                  </p>
                </div>
              </div>
            </div>
  
            <div className="rounded-[30px] border border-white/10 bg-[#0b1320] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-8">
              <div className="text-sm font-extrabold uppercase tracking-[0.2em] text-red-400">
                Utilisation & droits
              </div>
  
              <div className="mt-8 space-y-6 text-sm leading-7 text-white/78 sm:text-base">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
                  <h2 className="text-base font-extrabold text-white sm:text-lg">
                    4. Finalités du traitement
                  </h2>
                  <p className="mt-3">
                    Les données collectées peuvent être utilisées pour répondre
                    aux demandes des utilisateurs, améliorer les services, suivre
                    l’audience du site, assurer la sécurité de la plateforme et
                    communiquer avec les visiteurs lorsqu’ils en font la demande.
                  </p>
                </div>
  
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
                  <h2 className="text-base font-extrabold text-white sm:text-lg">
                    5. Conservation des données
                  </h2>
                  <p className="mt-3">
                    Les données sont conservées pendant la durée strictement
                    nécessaire aux finalités pour lesquelles elles ont été
                    collectées, sauf obligation légale contraire.
                  </p>
                </div>
  
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
                  <h2 className="text-base font-extrabold text-white sm:text-lg">
                    6. Droits des utilisateurs
                  </h2>
                  <p className="mt-3">
                    Vous pouvez demander l’accès, la rectification ou la
                    suppression de vos données personnelles, ainsi que vous
                    opposer à certains traitements, en contactant :
                    <br />
                    <span className="font-semibold text-white">
                      contact@lintelligent.tv
                    </span>
                  </p>
                </div>
  
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
                  <h2 className="text-base font-extrabold text-white sm:text-lg">
                    7. Sécurité
                  </h2>
                  <p className="mt-3">
                    L&apos;Intelligent TV met en œuvre des mesures raisonnables de
                    sécurité afin de protéger les données contre l’accès non
                    autorisé, la perte, l’altération ou la divulgation.
                  </p>
                </div>
  
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
                  <h2 className="text-base font-extrabold text-white sm:text-lg">
                    8. Contact
                  </h2>
                  <p className="mt-3">
                    Pour toute question relative à la présente politique de
                    confidentialité :
                    <br />
                    L&apos;INTELLIGENT TV
                    <br />
                    Email : contact@lintelligent.tv
                    <br />
                    Téléphone : 00225 07 07 81 56 77
                    <br />
                    Adresse : Abidjan Riviera Palmeraie, Côte d&apos;Ivoire
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }