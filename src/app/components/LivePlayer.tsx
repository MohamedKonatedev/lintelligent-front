"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import { HOME_LIVE_POSTER, IMAGE_QUALITY } from "@/lib/image-defaults";
import { isLikelyStreamUrl } from "@/lib/live-stream";

type Props = {
  src: string;
  title?: string;
  /**
   * Accueil : affiche une affiche statique (LCP) puis attache le flux après idle/load.
   * `/live` : laisser `false` pour démarrage immédiat.
   */
  deferStreamLoad?: boolean;
  poster?: string;
};

function streamHost(src: string): string {
  try {
    return new URL(src).hostname || "unknown";
  } catch {
    return "unknown";
  }
}

function scheduleDeferredAttach(onAttach: () => void) {
  const run = () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(onAttach, { timeout: 2500 });
    } else {
      window.setTimeout(onAttach, 150);
    }
  };

  if (document.readyState === "complete") {
    run();
  } else {
    window.addEventListener("load", run, { once: true });
  }
}

export default function LivePlayer({
  src,
  title = "Live L'Intelligent TV",
  deferStreamLoad = false,
  poster = HOME_LIVE_POSTER,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const useDirectStream = useMemo(() => isLikelyStreamUrl(src), [src]);
  const [attachStream, setAttachStream] = useState(!deferStreamLoad);

  useEffect(() => {
    if (!deferStreamLoad) return;
    scheduleDeferredAttach(() => setAttachStream(true));
  }, [deferStreamLoad]);

  useEffect(() => {
    if (!attachStream || !useDirectStream || !videoRef.current) return;

    const video = videoRef.current;
    let hlsInstance: { destroy: () => void } | null = null;
    let cancelled = false;

    const tryUnmutedAutoplay = async () => {
      video.muted = false;
      video.volume = 1;
      try {
        await video.play();
        return true;
      } catch {
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
  }, [src, useDirectStream, attachStream]);

  useEffect(() => {
    if (!attachStream || !useDirectStream) return;

    const video = videoRef.current;
    if (!video) return;

    let activelyPlaying = false;
    let heartbeatId: ReturnType<typeof setInterval> | null = null;
    let lastBufferingAt = 0;

    const baseParams = () => ({
      player_type: "hls" as const,
      page_location:
        typeof window !== "undefined" ? window.location.pathname : "",
      stream_source: streamHost(src),
    });

    const track = (eventName: string, extra?: Record<string, string | number>) => {
      try {
        sendGAEvent("event", eventName, {
          ...baseParams(),
          ...extra,
        });
      } catch {
        // Le Direct ne doit jamais dépendre de GA.
      }
    };

    const stopHeartbeat = () => {
      if (heartbeatId == null) return;
      clearInterval(heartbeatId);
      heartbeatId = null;
    };

    const startHeartbeat = () => {
      if (heartbeatId != null) return;
      heartbeatId = setInterval(() => {
        if (
          !video ||
          video.paused ||
          video.ended ||
          video.readyState < 2
        ) {
          activelyPlaying = false;
          stopHeartbeat();
          return;
        }
        track("live_heartbeat");
      }, 30_000);
    };

    const onPlay = () => {
      track("live_play");
    };

    const onPlaying = () => {
      if (activelyPlaying) return;
      activelyPlaying = true;
      track("live_playing");
      startHeartbeat();
    };

    const onPause = () => {
      const wasPlaying = activelyPlaying;
      activelyPlaying = false;
      stopHeartbeat();
      if (wasPlaying) track("live_pause");
    };

    const onWaiting = () => {
      const now = Date.now();
      if (now - lastBufferingAt < 5_000) return;
      lastBufferingAt = now;
      activelyPlaying = false;
      stopHeartbeat();
      track("live_buffering", { reason: "waiting" });
    };

    const onStalled = () => {
      const now = Date.now();
      if (now - lastBufferingAt < 5_000) return;
      lastBufferingAt = now;
      activelyPlaying = false;
      stopHeartbeat();
      track("live_buffering", { reason: "stalled" });
    };

    const onEnded = () => {
      activelyPlaying = false;
      stopHeartbeat();
    };

    const onError = () => {
      activelyPlaying = false;
      stopHeartbeat();
      track("live_error");
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onStalled);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);

    return () => {
      activelyPlaying = false;
      stopHeartbeat();
      video.removeEventListener("play", onPlay);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
    };
  }, [src, useDirectStream, attachStream]);

  const showPosterOnly = deferStreamLoad && !attachStream && useDirectStream;

  return (
    <div className="relative w-full overflow-hidden rounded-[18px] bg-black">
      {showPosterOnly ? (
        <div className="relative aspect-video w-full">
          <Image
            src={poster}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 896px"
            quality={IMAGE_QUALITY}
            className="object-cover"
          />
        </div>
      ) : useDirectStream ? (
        <video
          ref={videoRef}
          title={title}
          className="block aspect-video w-full border-0"
          controls
          playsInline
          preload={deferStreamLoad ? "none" : "metadata"}
          autoPlay
          poster={poster}
        />
      ) : (
        <iframe
          src={src}
          title={title}
          className="block aspect-video w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      )}
    </div>
  );
}
