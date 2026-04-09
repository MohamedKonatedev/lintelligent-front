import LivePlayer from "../components/LivePlayer";
import ShareButton from "./ShareButton";

type LivePost = {
  id: number;
  acf?: {
    player?: string;
    lien_live?: string;
    satut_live?: string;
  };
};

async function getLive(): Promise<LivePost | null> {
  const res = await fetch("http://cms.lintelligent.tv/wp-json/wp/v2/live", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Impossible de récupérer le live");
  }

  const data: LivePost[] = await res.json();
  return data.length > 0 ? data[0] : null;
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.8ZM9.6 15.7V8.3l6.4 3.7-6.4 3.7Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1c0 6 4.4 11 10.1 11.9v-8.4H7.1v-3.5h3V9.5c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.3h3.4l-.5 3.5h-2.9V24C19.6 23.1 24 18.1 24 12.1z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M4.98 3.5A2.49 2.49 0 1 0 5 8.48a2.49 2.49 0 0 0-.02-4.98ZM2.75 9h4.5v12h-4.5V9ZM9 9h4.31v1.64h.06c.6-1.14 2.06-2.34 4.24-2.34 4.54 0 5.39 2.99 5.39 6.88V21h-4.5v-5.14c0-1.23-.02-2.8-1.7-2.8-1.71 0-1.97 1.33-1.97 2.71V21H9V9Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-5-6.5L6.2 22H3l7.3-8.4L.8 2h6.4l4.5 6L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z" />
    </svg>
  );
}

function TwitchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M2 2h20v13l-4 4h-4l-2 2h-3v-2H5l-3-3V2Zm2 2v10l2 2h4v2l2-2h5l3-3V4H4Zm5 2h2v5H9V6Zm5 0h2v5h-2V6Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M14 3c.4 1.9 1.5 3.3 3.4 4.1.8.3 1.7.5 2.6.5v3.2c-1.5 0-3-.4-4.3-1.1v6.2a5.9 5.9 0 1 1-5.9-5.9c.4 0 .8 0 1.2.1v3.3a2.7 2.7 0 1 0 1.5 2.5V3H14Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm6.9 6h-3.1a15.7 15.7 0 0 0-1.4-3.3A8 8 0 0 1 18.9 8ZM12 4.1A13.6 13.6 0 0 1 13.8 8h-3.6A13.6 13.6 0 0 1 12 4.1ZM4.1 14A8.2 8.2 0 0 1 4 12c0-.7.1-1.4.3-2h3.5a17.2 17.2 0 0 0 0 4H4.1Zm1 2h3.1a15.7 15.7 0 0 0 1.4 3.3A8 8 0 0 1 5.1 16ZM8.2 8H4.9a8 8 0 0 1 4.5-3.3A15.7 15.7 0 0 0 8.2 8Zm3.8 11.9A13.6 13.6 0 0 1 10.2 16h3.6A13.6 13.6 0 0 1 12 19.9ZM14.2 14H9.8a15.2 15.2 0 0 1 0-4h4.4a15.2 15.2 0 0 1 0 4Zm.4 5.3a15.7 15.7 0 0 0 1.4-3.3h3.1a8 8 0 0 1-4.5 3.3Zm1.7-5.3a17.2 17.2 0 0 0 0-4h3.5c.2.6.3 1.3.3 2s-.1 1.4-.3 2h-3.5Z" />
    </svg>
  );
}

const socials = [
  { name: "YouTube", href: "https://m.youtube.com/channel/UC23vhsEy8dqmxPV1bC6r7uQ", icon: <YouTubeIcon /> },
  { name: "Facebook", href: "https://www.facebook.com/INTELLIGENTTV/", icon: <FacebookIcon /> },
  { name: "LinkedIn", href: "http://www.linkedin.com/in/lintelligent-web-tv", icon: <LinkedInIcon /> },
  { name: "X", href: "https://twitter.com/LintelligentTv", icon: <XIcon /> },
  { name: "Twitch", href: "https://www.twitch.tv/intelligentdirect", icon: <TwitchIcon /> },
  { name: "TikTok", href: "https://www.tiktok.com/@lintelligenttv?_r=1&_t=ZS-94nqpvs09ah", icon: <TikTokIcon /> },
  { name: "Limex", href: "https://limex.tv/lintelligent_tv_fr", icon: <GlobeIcon /> },
];

export default async function LivePage() {
  const live = await getLive();
  const statut = live?.acf?.satut_live;

  const liveSrc =
    live?.acf?.lien_live?.trim() ||
    "https://player.infomaniak.com/?channel=XW99617043325684590&player=12754";

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0">
        <img
          src="/bg-live.jpg"
          alt="Fond live"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,12,24,0.58)_0%,rgba(8,12,24,0.44)_45%,rgba(8,12,24,0.68)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.16),transparent_30%)]" />

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 sm:pb-12 sm:pt-20 lg:px-8 lg:pb-14 lg:pt-24">
        <div className="max-w-4xl">
          <div className="inline-flex items-center rounded-full border border-red-500/30 bg-red-600/15 px-4 py-2 text-[0.72rem] font-extrabold uppercase tracking-[0.22em] text-red-300">
            En direct
          </div>

          <h1 className="mt-5 max-w-3xl text-[clamp(1.8rem,4vw,3.6rem)] font-extrabold leading-[0.96] tracking-tight text-white">
            Regardez L&apos;Intelligent TV
            <span className="block text-white/78">en direct</span>
          </h1>

          <p className="mt-5 max-w-3xl text-[1rem] leading-7 text-white/72 sm:text-[1.08rem] sm:leading-8">
            Suivez notre diffusion en continu, nos émissions, nos rendez-vous
            d’actualité et nos contenus en temps réel sur tous vos écrans.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-10 sm:px-6 sm:pb-14 lg:px-8">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_320px] lg:gap-8">
          <div className="min-w-0">
            {statut === "en_direct" ? (
              <LivePlayer src={liveSrc} />
            ) : (
              <div className="rounded-[28px] border border-white/10 bg-black/25 px-6 py-8 text-center backdrop-blur-sm">
                <p className="mb-3 text-xl font-semibold sm:text-2xl">
                  Le direct est actuellement hors ligne
                </p>
                <p className="text-sm text-white/60 sm:text-base">
                  Revenez plus tard pour suivre notre programmation en direct.
                </p>
              </div>
            )}
          </div>

          <aside className="self-center rounded-[28px] border border-white/10 bg-black/22 p-5 shadow-xl backdrop-blur-md sm:p-6">
            <h2 className="mb-3 text-2xl font-extrabold leading-tight sm:text-[2rem]">
              Vous regardez actuellement L&apos;Intelligent TV
            </h2>

            <p className="mb-1 text-base font-medium text-white/85 sm:text-lg">
              Diffusion en continu 24h/24 et 7j/7
            </p>

            <p className="mb-5 text-sm leading-6 text-white/65 sm:text-base">
              Suivez-nous sur nos réseaux sociaux pour ne rien manquer.
            </p>

            <div className="mb-5 grid grid-cols-4 gap-2 sm:gap-3">
              {socials.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  title={social.name}
                  className="flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-white transition-all hover:border-red-500 hover:bg-red-600/90 sm:h-11"
                >
                  {social.icon}
                </a>
              ))}
            </div>

            <ShareButton />
          </aside>
        </div>
      </section>
    </main>
  );
}