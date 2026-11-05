# Déploiement unique — VPS LWS (Docker)

**Ne pas exécuter sans validation explicite.** Production actuelle inchangée jusqu’à bascule.

## 1. Sauvegarde / rollback

Noter l’image ou le tag Docker actuellement en service :

```bash
docker ps --filter name=lintelligent
docker inspect <container_id> --format '{{.Config.Image}}'
```

Rollback rapide si échec :

```bash
docker stop lintelligent-front && docker rm lintelligent-front
docker run -d --name lintelligent-front --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  --env-file /chemin/securise/.env \
  <IMAGE_PREcedente>:<tag>
sudo nginx -t && sudo systemctl reload nginx
```

## 2. Mise à jour code

```bash
cd /chemin/lintelligent-front
git fetch origin
git checkout fix/seo-audit-complete
git pull origin fix/seo-audit-complete
# Vérifier le commit attendu : git log -1 --oneline
```

## 3. Build image

```bash
docker build -t lintelligent-front:release .
```

Variables runtime (fichier `.env` **hors Git**, jamais dans l’image) :

- `WP_API_URL` — ex. `http://cms.lintelligent.tv/wp-json/wp/v2` (réseau Docker interne si applicable)
- `NEXT_PUBLIC_SITE_URL=https://lintelligent.tv`
- `NEXT_PUBLIC_LIVE_HLS_URL` — si défini sur le VPS
- Ne **pas** définir `NEXT_PUBLIC_DISABLE_GA` en production

## 4. Remplacement conteneur

```bash
docker stop lintelligent-front || true
docker rm lintelligent-front || true
docker run -d --name lintelligent-front --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  --env-file /chemin/securise/.env \
  lintelligent-front:release
docker logs -f --tail 50 lintelligent-front
```

## 5. Vérifications post-déploiement (5 min)

| Contrôle | Attendu |
|----------|---------|
| `curl -sI https://lintelligent.tv/` | `Cache-Control` avec `s-maxage=600` (plus de max-age 31536000 sur HTML accueil) |
| `curl -sI https://lintelligent.tv/live` | pas de cache HTML long (dynamic) |
| Accueil navigateur | poster puis direct |
| `/live` | direct immédiat |
| `curl -sI https://www.lintelligent.tv/` | **308** → apex |
| `curl -s https://lintelligent.tv/sitemap.xml` | index valide |
| `/_next/image?url=...` | 200, type image/webp ou avif |

## 6. Cloudflare (plus tard)

Règles suggérées une fois activé : bypass cache sur `/live`, respect `s-maxage` Next pour HTML, cache long sur `/_next/static/*`.
