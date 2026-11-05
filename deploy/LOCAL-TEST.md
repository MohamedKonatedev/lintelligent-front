# Tests locaux (Mac) — avant déploiement VPS

## Prérequis

- Node.js 22 (aligné Dockerfile)
- Accès réseau vers `https://cms.lintelligent.tv` (lecture seule)

## Configuration

```bash
cp deploy/env.example .env.local
# Ajuster WP_API_URL si besoin ; NEXT_PUBLIC_DISABLE_GA=true recommandé
```

## Build et lancement production

Le projet est en `output: "standalone"` (comme le VPS). Utiliser le serveur standalone, pas `next start` seul.

```bash
npm ci
npx tsc --noEmit
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
PORT=3002 node .next/standalone/server.js
```

Ouvrir **http://localhost:3002** (si le port 3000 est déjà pris sur le Mac).

## Parcours de recette manuelle

1. Accueil — affiche live (poster) puis direct (~1–2 s)
2. Slider — une seule affiche chargée à la fois
3. `/live` — direct immédiat
4. `/replays` — miniatures via `/_next/image`
5. Une fiche `/videos/...`
6. `/programmes` et une émission
7. Recherche (header)
8. URL inexistante → page 404
9. Mobile : outils dev, 375 px

## Docker (VPS)

Si Docker Desktop est installé :

```bash
docker build -t lintelligent-front:local .
docker run --rm -p 3000:3000 \
  -e WP_API_URL=https://cms.lintelligent.tv/wp-json/wp/v2 \
  -e NEXT_PUBLIC_SITE_URL=https://lintelligent.tv \
  -e NEXT_PUBLIC_DISABLE_GA=true \
  lintelligent-front:local
```

Sans Docker sur le Mac : valider via `npm run build` + `npm run start` ; l’image Docker reste à builder sur le VPS au déploiement.
