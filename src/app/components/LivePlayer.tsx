"use client";

import { useEffect, useMemo, useRef } from "react";
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

  useEffect(() => {
    if (!useDirectStream || !videoRef.current) return;

    const video = videoRef.current;
    let hlsInstance: { destroy: () => void } | null = null;
    let cancelled = false;

    /** Tente le son dès l’ouverture ; si le navigateur bloque, bascule en muet puis réessaie au premier geste. */
    const tryUnmutedAutoplay = async () => {
      video.muted = false;
      video.volume = 1;
      try {
        await video.play();
        return true;
      } catch {
        // Politique navigateur : autoplay avec son souvent refusé.
        video.muted = true;
        try {
          await video.play();
        } catch {
          // Contrôles manuels restent disponibles.
        }
        return false;
      }
    };

    const unmuteOnGesture = () => {
      const v = videoRef.current;
      if (!v || cancelled) return;
      v.muted = false;
      v.volume = 1;
      void v.play().catch(() => {});
    };

    // Si le son a été bloqué, le premier geste sur la page débloque le son (sans bouton dédié).
    const gestureEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
    ];
    const onGesture = () => {
      unmuteOnGesture();
      for (const ev of gestureEvents) {
        window.removeEventListener(ev, onGesture);
      }
    };
    for (const ev of gestureEvents) {
      window.addEventListener(ev, onGesture, { once: true, passive: true });
    }

    const attach = async () => {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        await tryUnmutedAutoplay();
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
        void tryUnmutedAutoplay();
      });
      hlsInstance = hls;
    };

    void attach();

    return () => {
      cancelled = true;
      for (const ev of gestureEvents) {
        window.removeEventListener(ev, onGesture);
      }
      hlsInstance?.destroy();
      if (video) video.removeAttribute("src");
    };
  }, [src, useDirectStream]);

  return (
    <div className="w-full overflow-hidden rounded-[18px] bg-black">
      {useDirectStream ? (
        <video
          ref={videoRef}
          title={title}
          className="block aspect-video w-full border-0"
          controls
          playsInline
          preload="auto"
          autoPlay
        />
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
