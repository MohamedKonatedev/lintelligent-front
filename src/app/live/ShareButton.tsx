"use client";

export default function ShareButton() {
  const handleShare = async () => {
    const shareData = {
      title: "L'Intelligent TV Live",
      text: "Regardez L'Intelligent TV en direct.",
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        alert("Lien copié dans le presse-papiers");
      }
    } catch {
      // pas de message si l'utilisateur annule
    }
  };

  return (
    <button
      onClick={handleShare}
      className="w-full rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 transition-colors px-4 py-3 font-medium"
    >
      Partager
    </button>
  );
}