"use client";

type ShareButtonProps = {
  title: string;
  text?: string;
};

export default function ShareButton({
  title,
  text = "Découvre cette vidéo",
}: ShareButtonProps) {
  async function handleShare() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      alert("Lien copié.");
    } catch {
      // rien
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="rounded-full border border-white/20 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
    >
      Partager
    </button>
  );
}