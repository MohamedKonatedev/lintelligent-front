"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isLikelyStreamUrl } from "@/lib/live-stream";

type Props = {
  src: string;
  title?: string;
};

export default function LivePlayer({
  src,
  title = "Live L'Intelligent TV",
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const useDirectStream = useMemo(() => isLikelyStreamUrl(src), [src]);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (!useDirectStream || !videoRef.current) return;

    const video = videoRef.current;
    let hlsInstance: { destroy: () => void } | null = null;
    let cancelled = false;

    const tryMutedAutoplay = () => {
      video.muted = true;
      video.play().catch(() => {
        // Certaines politiques navigateur bloquent malgré muted; on garde le contrôle manuel.
      });
    };

    const attach = async () => {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        tryMutedAutoplay();
        return;
      }

      const mod = await import("hls.js");
      const Hls = mod.default;
      if (cancelled || !Hls.isSupported()) return;

      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        tryMutedAutoplay();
      });
      hlsInstance = hls;
    };

    void attach();

    return () => {
      cancelled = true;
      hlsInstance?.destroy();
      if (video) video.removeAttribute("src");
    };
  }, [src, useDirectStream]);

  const handleEnableSound = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setIsMuted(false);
    await video.play().catch(() => {
      // Si play échoue, l'utilisateur peut utiliser les contrôles natifs.
    });
  };

  return (
    <div className="w-full overflow-hidden rounded-[18px] bg-black">
      {useDirectStream ? (
        <div className="relative">
          <video
            ref={videoRef}
            title={title}
            className="block aspect-video w-full border-0"
            controls
            playsInline
            preload="auto"
            autoPlay
            muted
            onVolumeChange={() => {
              const v = videoRef.current;
              if (!v) return;
              setIsMuted(v.muted || v.volume === 0);
            }}
          />
          {isMuted && (
            <button
              type="button"
              onClick={handleEnableSound}
              className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25 transition hover:bg-black/80"
            >
              Activer le son
            </button>
          )}
        </div>
      ) : (
        <iframe
          src={src}
          title={title}
          className="block aspect-video w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}