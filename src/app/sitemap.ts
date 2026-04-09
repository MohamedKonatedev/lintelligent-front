export default function sitemap() {
    const baseUrl = "https://lintelligent.tv";
  
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/live`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/replays`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/programmes`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/grille-programmes`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/notre-chaine`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/contact`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/mentions-legales`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/politique-confidentialite`,
        lastModified: new Date(),
      },
    ];
  }