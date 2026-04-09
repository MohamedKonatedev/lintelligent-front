import HomeHeroSlider from "./components/HomeHeroSlider";
import LivePlayer from "./components/LivePlayer";

const emissions = [
  {
    title: "La Quotidienne du Sport",
    href: "/programmes/la-quotidienne-du-sport",
    image: "/home/la quotidienne du sport.png",
    accent: "#2b8cff",
  },
  {
    title: "L'Invité",
    href: "/programmes/linvite",
    image: "/home/L'INVITÉ.png",
    accent: "#d9a11a",
  },
  {
    title: "Le Débat",
    href: "/programmes/le-debat",
    image: "/home/le débat.png",
    accent: "#1fc423",
  },
  {
    title: "À vous la parole",
    href: "/programmes/a-vous-la-parole",
    image: "/home/à vous la parole.png",
    accent: "#e21a23",
  },
  {
    title: "Les Entretiens",
    href: "/programmes/les-entretiens",
    image: "/home/les entretiens.png",
    accent: "#1fb7cc",
  },
  {
    title: "Actu Sport",
    href: "/programmes/actu-sport",
    image: "/home/actu sport.png",
    accent: "#16a34a",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#101722] text-[#f3f6fb]">
      <HomeHeroSlider />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            En direct
          </h2>
        </div>

        <LivePlayer src="https://player.infomaniak.com/?channel=XW99617043325684590&player=12754" />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Nos émissions
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {emissions.map((item, index) => (
            <a
              key={item.title}
              href={item.href}
              className="group overflow-hidden rounded-[26px] bg-[#182130] shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1"
            >
              <div className="relative overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  loading={index < 4 ? "eager" : "lazy"}
                  decoding="async"
                  className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105 group-hover:grayscale"
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-1"
                  style={{ backgroundColor: item.accent }}
                />
              </div>

              <div className="p-5">
                <h3 className="text-xl font-bold text-white">{item.title}</h3>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}