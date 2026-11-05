import type { ReactNode } from "react";
import { getSocialLinks } from "@/lib/social-links";

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

const ICONS: Record<string, () => ReactNode> = {
  YouTube: YouTubeIcon,
  Facebook: FacebookIcon,
  LinkedIn: LinkedInIcon,
  X: XIcon,
  Twitch: TwitchIcon,
  TikTok: TikTokIcon,
  Limex: GlobeIcon,
};

type Props = {
  className?: string;
  linkClassName?: string;
};

export default function SocialLinksGrid({
  className = "grid grid-cols-4 gap-2 sm:gap-3",
  linkClassName = "flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-white transition-all hover:border-red-500 hover:bg-red-600/90 sm:h-11",
}: Props) {
  const socials = getSocialLinks();

  return (
    <div className={className}>
      {socials.map((social) => {
        const Icon = ICONS[social.name] ?? GlobeIcon;
        return (
          <a
            key={social.name}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.name}
            title={social.name}
            className={linkClassName}
          >
            <Icon />
          </a>
        );
      })}
    </div>
  );
}
