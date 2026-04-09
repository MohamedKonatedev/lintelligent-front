"use client";

export default function SiteFooter() {
  return (
    <footer className="bg-[#050914] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <img
              src="/home/IAtv-logo.png"
              alt="L'Intelligent TV"
              className="mb-4 h-10 w-auto"
            />

            <p className="max-w-sm text-sm leading-7 text-white/70">
              L’Intelligent TV est une chaîne d’information en continu disponible
              24h/24, pensée pour le digital et accessible sur tous vos écrans.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/55">
              Navigation
            </h3>

            <ul className="space-y-3 text-sm text-white/78">
              <li>
                <a href="/replays" className="transition hover:text-red-400">
                  Replays
                </a>
              </li>
              <li>
                <a href="/programmes" className="transition hover:text-red-400">
                  Nos programmes
                </a>
              </li>
              <li>
                <a href="/grille-programmes" className="transition hover:text-red-400">
                  Grille des programmes
                </a>
              </li>
              <li>
                <a href="/notre-chaine" className="transition hover:text-red-400">
                  Notre chaîne
                </a>
              </li>
              <li>
                <a href="/live" className="transition hover:text-red-400">
                  En direct
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/55">
              Contact
            </h3>

            <ul className="space-y-3 text-sm leading-7 text-white/70">
              <li>Abidjan, Riviera Palmeraie</li>
              <li>Côte d’Ivoire</li>
              <li>+225 07 07 81 56 77</li>
              <li>
                <a
                  href="mailto:contact@lintelligent.tv"
                  className="transition hover:text-red-400"
                >
                  contact@lintelligent.tv
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-5 text-center text-sm text-white/60 md:flex-row md:text-left">
          <p>© {new Date().getFullYear()} L’Intelligent TV — Tous droits réservés</p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="/contact" className="transition hover:text-white">
              Contact
            </a>
            <a href="/mentions-legales" className="transition hover:text-white">
              Mentions légales
            </a>
            <a
              href="/politique-confidentialite"
              className="transition hover:text-white"
            >
              Confidentialité
            </a>
          </div>

          <p>
            Conçu et édité par{" "}
            <a
              href="https://www.agroup.ci/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white transition hover:text-red-400"
            >
              Agroup
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}