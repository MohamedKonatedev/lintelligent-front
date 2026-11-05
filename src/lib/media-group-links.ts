/** Liens inter-médias — uniquement si URL confirmée (variable d’environnement). */
export type MediaGroupLink = {
  name: string;
  href: string;
};

export function getMediaGroupLinks(): MediaGroupLink[] {
  const entries: Array<[string, string | undefined]> = [
    ["Afrikipresse", process.env.NEXT_PUBLIC_AFRIKIPRESSE_URL],
    ["L'Intelligent d'Abidjan", process.env.NEXT_PUBLIC_LINTELLIGENT_ABIDJAN_URL],
  ];

  return entries
    .map(([name, href]) => {
      const url = href?.trim();
      if (!url || !/^https?:\/\//i.test(url)) return null;
      return { name, href: url };
    })
    .filter((x): x is MediaGroupLink => x !== null);
}
