"use client";

import { useEffect, useMemo, useState } from "react";
import { getRecentPrograms } from "@/app/hooks/useRecentPrograms";

const menuItems = [
  { label: "Replays", href: "/replays" },
  { label: "Nos programmes", href: "/programmes" },
  { label: "Grille des programmes", href: "/grille-programmes" },
  { label: "Notre chaîne", href: "/notre-chaine" },
  { label: "En direct", href: "/live", isLive: true },
];

const mobileExtraLinks = [
  { label: "Contact", href: "/contact" },
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "Politique de confidentialité", href: "/politique-confidentialite" },
];

type SearchResult = {
  id: string;
  title: string;
  type: string;
  image: string | null;
  href: string;
};

type RecentProgram = {
  id: string;
  title: string;
  image?: string;
  url: string;
};

function LiveSignal({ mobile = false }: { mobile?: boolean }) {
  return (
    <span
      className={`relative flex items-center justify-center rounded-full bg-white/14 ${
        mobile ? "h-5 w-5" : "h-5 w-5 lg:h-6 lg:w-6"
      }`}
    >
      <span
        className={`absolute rounded-full bg-white ${
          mobile ? "h-1.5 w-1.5" : "h-1.5 w-1.5 lg:h-[7px] lg:w-[7px]"
        }`}
      />
      <span
        className={`absolute rounded-full border border-white/80 animate-ping ${
          mobile ? "h-3.5 w-3.5" : "h-3.5 w-3.5 lg:h-4 lg:w-4"
        }`}
      />
      <svg
        viewBox="0 0 24 24"
        className={`relative text-white ${
          mobile ? "h-[13px] w-[13px]" : "h-[13px] w-[13px] lg:h-[15px] lg:w-[15px]"
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M9.2 9.2a4 4 0 0 0 0 5.6" />
        <path d="M14.8 9.2a4 4 0 0 1 0 5.6" />
        <path d="M6.6 6.7a7.5 7.5 0 0 0 0 10.6" />
        <path d="M17.4 6.7a7.5 7.5 0 0 1 0 10.6" />
      </svg>
    </span>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export default function SiteHeader() {
  const [active, setActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentPrograms, setRecentPrograms] = useState<RecentProgram[]>([]);

  useEffect(() => {
    const onScroll = () => setActive(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    setRecentPrograms(getRecentPrograms());
  }, [searchOpen]);

  useEffect(() => {
    const run = async () => {
      const q = query.trim();

      if (q.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(run, 280);
    return () => clearTimeout(timer);
  }, [query]);

  const searchHasQuery = query.trim().length >= 2;

  const desktopNav = useMemo(() => menuItems, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${
          active
            ? "bg-[#000000]"
            : "bg-gradient-to-b from-black via-black/80 to-black/35"
        }`}
      >
        <div className="mx-auto hidden h-[80px] max-w-7xl items-center px-4 sm:px-5 lg:flex">
          <a href="/" className="flex shrink-0 items-center">
            <img
              src="/home/IAtv-logo.png"
              alt="L'Intelligent TV"
              className="h-10 w-auto object-contain xl:h-11"
            />
          </a>

          <nav className="ml-auto flex items-center gap-6 xl:gap-8">
            {desktopNav.map((item) =>
              item.isLive ? (
                <a
                  key={item.label}
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-[16px] bg-red-600 px-3.5 py-2 text-[15px] font-semibold text-white shadow-[0_8px_22px_rgba(220,38,38,0.22)] transition hover:bg-red-500"
                >
                  <LiveSignal />
                  <span className="leading-none">En direct</span>
                </a>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-[15px] font-semibold text-white/92 transition hover:text-white"
                >
                  {item.label}
                </a>
              )
            )}

            <button
              type="button"
              aria-label="Ouvrir la recherche"
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            >
              <SearchIcon />
            </button>
          </nav>
        </div>

        <div className="mx-auto flex h-[70px] max-w-7xl items-center px-4 sm:h-[74px] sm:px-5 lg:hidden">
          <a href="/" className="relative z-[80] flex shrink-0 items-center">
            <img
              src="/home/IAtv-logo.png"
              alt="L'Intelligent TV"
              className="h-7 w-auto object-contain sm:h-8"
            />
          </a>

          <button
            type="button"
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="absolute left-1/2 top-1/2 z-[80] inline-flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          >
            <span className="relative block h-5 w-6">
              <span className="absolute left-0 top-0 block h-[2.5px] w-6 rounded-full bg-white" />
              <span className="absolute left-0 top-1/2 block h-[2.5px] w-6 -translate-y-1/2 rounded-full bg-white" />
              <span className="absolute left-0 bottom-0 block h-[2.5px] w-6 rounded-full bg-white" />
            </span>
          </button>

          <a
            href="/live"
            className="relative z-[80] ml-auto inline-flex items-center gap-2 rounded-xl bg-red-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-[0_8px_22px_rgba(220,38,38,0.24)]"
          >
            <LiveSignal mobile />
            <span>En direct</span>
          </a>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[70] lg:hidden transition-opacity duration-200 ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`absolute inset-0 bg-[#020812]/65 backdrop-blur-[2px] transition-opacity duration-200 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
        />

        <div
          className={`relative h-full w-[82%] max-w-[360px] bg-[#020812]/94 px-6 pb-10 pt-6 shadow-[20px_0_40px_rgba(0,0,0,0.28)] backdrop-blur-[10px] transition-transform duration-200 ease-out ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-8 flex items-center justify-between">
            <a href="/" onClick={() => setMenuOpen(false)} className="flex items-center">
              <img
                src="/home/IAtv-logo.png"
                alt="L'Intelligent TV"
                className="h-8 w-auto object-contain"
              />
            </a>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Ouvrir la recherche"
                onClick={() => {
                  setMenuOpen(false);
                  setSearchOpen(true);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
              >
                <SearchIcon />
              </button>

              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <nav>
            <ul className="space-y-6">
              {[...menuItems, ...mobileExtraLinks].map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block text-[18px] font-bold leading-none text-white transition hover:text-red-400 sm:text-[19px]"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-[80] transition-all duration-200 ${
          searchOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`absolute inset-0 bg-[#020812]/72 backdrop-blur-[6px] transition-opacity duration-200 ${
            searchOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setSearchOpen(false)}
        />

        <div
          className={`relative mx-auto mt-20 w-[calc(100%-24px)] max-w-6xl rounded-[28px] border border-white/10 bg-[#07101d]/95 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] transition-all duration-200 sm:mt-24 sm:p-5 ${
            searchOpen ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-[0.98] opacity-0"
          }`}
        >
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="text-white/90">
              <SearchIcon />
            </div>

            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une émission, une vidéo..."
              className="h-12 flex-1 bg-transparent text-base font-medium text-white outline-none placeholder:text-white/38 sm:text-[1.05rem]"
            />

            <button
              type="button"
              aria-label="Fermer la recherche"
              onClick={() => {
                setSearchOpen(false);
                setQuery("");
                setResults([]);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="mt-6 max-h-[68vh] overflow-y-auto pr-1">
            {!searchHasQuery && (
              <>
                <h3 className="mb-5 text-[1.05rem] font-extrabold text-white sm:text-[1.15rem]">
                  Derniers programmes visités
                </h3>

                {recentPrograms.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {recentPrograms.map((item) => (
                      <a
                        key={item.id}
                        href={item.url}
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery("");
                        }}
                        className="group"
                      >
                        <div className="overflow-hidden rounded-[18px] bg-white/5">
                          <img
                            src={item.image || "/bg-live.jpg"}
                            alt={item.title}
                            className="h-56 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                        </div>

                        <div className="mt-3 text-base font-bold text-white">
                          {item.title}
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white/[0.04] px-4 py-4 text-sm text-white/55">
                    Aucun programme visité récemment.
                  </div>
                )}
              </>
            )}

            {searchHasQuery && (
              <>
                {loading && (
                  <div className="rounded-2xl bg-white/[0.04] px-4 py-4 text-sm text-white/60">
                    Recherche en cours...
                  </div>
                )}

                {!loading && results.length > 0 && (
                  <div className="space-y-3">
                    {results.map((item) => (
                      <a
                        key={item.id}
                        href={item.href}
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery("");
                        }}
                        className="flex items-center gap-4 rounded-[20px] px-3 py-3 transition hover:bg-white/[0.06]"
                      >
                        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-white/5">
                          <img
                            src={item.image || "/bg-live.jpg"}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-lg font-extrabold text-white">
                            {item.title}
                          </div>
                          <div className="mt-1 text-sm text-white/45">
                            {item.type}
                          </div>
                        </div>

                        <span className="shrink-0 text-xl text-white/35">↗</span>
                      </a>
                    ))}
                  </div>
                )}

                {!loading && results.length === 0 && (
                  <div className="rounded-2xl bg-white/[0.04] px-4 py-4 text-sm text-white/55">
                    Aucun résultat trouvé.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}