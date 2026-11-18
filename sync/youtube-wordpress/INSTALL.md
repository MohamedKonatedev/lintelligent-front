# Synchronisation YouTube → WordPress

Le rôle WordPress est prêt à être copié. Le timer et la publication automatique restent arrêtés tant que `YT_SYNC_ENABLED` n'est pas passé à `1`. Aucune vidéo n'est publiée par ce dépôt.

Le script ne modifie pas le conteneur Next.js, le DNS ni Cloudflare. Il tourne sur l'hôte, en dehors de l'image Docker.

## Architecture

```
timer systemd (10 min)
    → python3 /opt/lintelligent-yt-sync/yt_wp_sync.py --apply
        → YouTube Data API v3 (playlist des mises en ligne + videos.list)
        → WordPress REST POST /wp/v2/videos  (création seule)
```

- Chaîne : `UC23vhsEy8dqmxPV1bC6r7uQ` (`@LintelligentTV`).
- Endpoint : `playlistItems` puis `videos.list`. `search.list` n'est pas utilisé (100 unités par appel).
- En régime normal : environ 3 unités YouTube toutes les 10 minutes, soit moins de 500 unités par jour pour un quota par défaut de 10 000.
- Sans clé API, le flux Atom public sert uniquement de prévisualisation. Il ne permet pas de publier : la durée, le statut privé et l'état du direct n'y figurent pas.
- Les secrets restent dans `/etc/lintelligent/youtube-sync.env` (`chmod 600`). L'état reste dans `/var/lib/lintelligent-yt-sync`. Les deux sont hors dépôt et hors image.
- Le frontend continue de lire `GET /wp/v2/videos`. Aucun champ nouveau n'est requis.

## Champs WordPress observés

Le schéma public de `GET/OPTIONS /wp-json/wp/v2/videos` expose exactement ces champs ACF :

| Champ | Rôle actuel | Rempli par la synchro |
|---|---|---|
| `title` | Titre de la page, du partage et du JSON-LD | Titre YouTube |
| `content` | Texte sous le lecteur | Description YouTube, échappée, en paragraphes |
| `date_gmt` | Tri des replays, sitemap, `uploadDate` | Date de publication YouTube |
| `featured_media` | Image des cartes replay | Miniature JPEG téléversée dans la médiathèque |
| `acf.lien_video` | Lecteur, miniature de repli, image Open Graph | `https://www.youtube.com/watch?v=ID` |
| `acf.duree` | Ligne « Durée » et `duration` schema.org | `20:33` ou `01:02:35` |
| `acf.date_diffusion` | Ligne « Diffusion », format `Ymd` | Jour YouTube en `Africa/Abidjan` |
| `acf.presentateur` | Ligne « Présentateur » | Non. La rédaction le saisit. |
| `categories` | Pages d'émission | Non. La rédaction choisit l'émission. |

Il n'y a pas d'extrait, ni de meta `youtube_id`. L'identifiant est déduit de `acf.lien_video`. Le fichier d'état retient aussi chaque identifiant déjà créé.

Une publication déjà créée n'est jamais mise à jour. Un doublon est ignoré si l'identifiant est dans `lien_video` ou dans l'état local. Les vidéos privées, non répertoriées, en traitement, non intégrables, programmées ou encore en direct sont ignorées. Un direct terminé, devenu replay public, peut être créé.

WordPress rangera une vidéo sans catégorie dans « Non classé ». Elle apparaît dans Tous les replays, pas dans une émission, tant que la rédaction n'a pas choisi la catégorie. Ce choix n'est ensuite pas réécrit.

Le site régénère les listes de replays en 120 secondes, la page vidéo et le sitemap en une heure. Ce délai est le comportement actuel ; il n'est pas modifié.

## Test local

Depuis la racine du projet :

```bash
python3 sync/youtube-wordpress/test_yt_wp_sync.py
python3 sync/youtube-wordpress/yt_wp_sync.py --dry-run \
  --report sync/youtube-wordpress/reports/last-dry-run.json
```

Le dry-run lit l'API publique et le flux YouTube. Il ne demande aucun secret et ne crée rien. `--apply` sans `YT_SYNC_ENABLED=1`, sans clé et sans bootstrap s'arrête avant toute écriture.

Pour voir l'effet d'un repère sans le sauvegarder :

```bash
python3 sync/youtube-wordpress/yt_wp_sync.py --dry-run \
  --import-after 2026-11-18T10:59:00Z
```

## Installation sur LWS — après validation seulement

1. Créer un utilisateur système `yt-sync` sans shell de connexion.
2. Copier `yt_wp_sync.py` vers `/opt/lintelligent-yt-sync/yt_wp_sync.py`.
3. Créer `/etc/lintelligent/youtube-sync.env` à partir de `env.example`, puis `chmod 600` et `chown yt-sync`.
4. Créer `/var/lib/lintelligent-yt-sync`, propriétaire `yt-sync`.
5. WordPress tourne dans Docker. Ses fichiers persistants sont sur l'hôte dans `/opt/lintelligent-wordpress/`, pas dans une racine Nginx `/var/www`. Copier le plugin à la racine de `mu-plugins` :

```bash
sudo mkdir -p /opt/lintelligent-wordpress/wp-content/mu-plugins
sudo cp sync/youtube-wordpress/wordpress/yt-sync-role.php \
  /opt/lintelligent-wordpress/wp-content/mu-plugins/yt-sync-role.php
sudo chown www-data:www-data /opt/lintelligent-wordpress/wp-content/mu-plugins/yt-sync-role.php
sudo chmod 644 /opt/lintelligent-wordpress/wp-content/mu-plugins/yt-sync-role.php
```

Un sous-dossier de `mu-plugins` ne serait pas chargé. Si `wp-content` n'est pas directement sous `/opt/lintelligent-wordpress/`, utiliser le chemin réel du volume monté dans le conteneur. Ce fichier est lu par PHP au chargement suivant ; il ne demande pas de reconstruire l'image Next.js ni de republier une vidéo.
6. Attribuer à l'utilisateur existant `youtube-sync` uniquement le rôle « Sync YouTube ». Retirer Abonné. Un administrateur crée ensuite le mot de passe d'application depuis la fiche de cet utilisateur : le compte lui-même n'ouvre pas wp-admin. Ne pas lui laisser Administrateur, Éditeur, Auteur ou Contributeur.
7. Vérifier le compte, sans créer de contenu :

```bash
sudo -u yt-sync /usr/bin/python3 /opt/lintelligent-yt-sync/yt_wp_sync.py \
  --auth-check --env-file /etc/lintelligent/youtube-sync.env
```

8. Dry-run sur le serveur, encore sans écriture. La clé API doit être posée, `YT_SYNC_ENABLED` reste à `0`.
9. Figer le repère anti-historique. Cette commande n'écrit rien dans WordPress :

```bash
sudo -u yt-sync /usr/bin/python3 /opt/lintelligent-yt-sync/yt_wp_sync.py \
  --bootstrap --env-file /etc/lintelligent/youtube-sync.env
```

Par défaut, `import_after` vaut l'instant du bootstrap. Tout ce qui est déjà public reste hors synchro. Pour reprendre quelques vidéos déjà en ligne, choisir d'abord la date avec un dry-run `--import-after`, puis seulement après validation :

```bash
sudo -u yt-sync /usr/bin/python3 /opt/lintelligent-yt-sync/yt_wp_sync.py \
  --bootstrap --import-after 2026-11-18T10:59:00Z \
  --env-file /etc/lintelligent/youtube-sync.env
```

10. Copier les unités systemd, `systemctl daemon-reload`, puis `systemctl enable --now lintelligent-yt-sync.timer` uniquement quand l'écriture est voulue.
11. Passer `YT_SYNC_ENABLED=1` en dernier. Avant cela, le timer tourne et journalise un refus.

Journaux :

```bash
journalctl -u lintelligent-yt-sync.service -n 80 --no-pager
```

Un dépassement de quota YouTube termine avec le code 75, sans avancer de publication. Le passage suivant reprend les vidéos non créées. Cinq créations maximum par passage du timer.

Sauvegarde utile : `/var/lib/lintelligent-yt-sync/state.json`. S'il disparaît, les vidéos encore publiques restent protégées par `lien_video`. Une vidéo passée en brouillon après coup ne l'est plus, si l'état a aussi été perdu.

## Import historique du 1er septembre au 18 novembre 2026

Cette commande est indépendante du timer. Elle ne modifie ni `import_after` ni `bootstrapped_at`. Elle parcourt toute la playlist des mises en ligne, pas seulement les 15 entrées du flux public. Sans clé API, elle s'arrête et ne crée rien.

Avant toute écriture, sauvegarder l'état :

```bash
sudo cp -a /var/lib/lintelligent-yt-sync/state.json \
  /var/lib/lintelligent-yt-sync/state.json.before-history
```

Reprise : recopier ce fichier à la place de `state.json` si l'import doit être annulé côté repères locaux. Les vidéos déjà créées dans WordPress ne sont pas supprimées par cette copie ; elles restent dédoublonnées par `lien_video`.

Dry-run, aucune publication :

```bash
sudo -u yt-sync /usr/bin/python3 /opt/lintelligent-yt-sync/yt_wp_sync.py \
  --history --dry-run \
  --history-from 2026-09-01 --history-to 2026-11-18 \
  --env-file /etc/lintelligent/youtube-sync.env \
  --report /var/lib/lintelligent-yt-sync/history-dry-run.json
```

Le rapport indique le total YouTube de la période, les vidéos déjà présentes, le reste à importer, la répartition par émission et les titres non classés ou ambigus. Une correspondance claire reçoit l'identifiant réel de la catégorie. Les autres restent « Non classé ». Aucune émission n'est inventée.

L'écriture n'est lancée qu'après validation de ce dry-run, avec le fichier d'environnement déjà en place. Ne pas le régénérer.

```bash
sudo -u yt-sync /usr/bin/python3 /opt/lintelligent-yt-sync/yt_wp_sync.py \
  --history --apply \
  --history-from 2026-09-01 --history-to 2026-11-18 \
  --env-file /etc/lintelligent/youtube-sync.env
```

Le classement par titre s'applique aussi aux vidéos créées ensuite par le timer. Le rôle `yt_sync` peut seulement rattacher une catégorie existante au moment de la création. Il ne peut ni créer ni supprimer une catégorie, ni modifier une vidéo déjà publiée.

## Rédaction éditoriale

Le titre WordPress et le contenu portent le texte affiché sur les pages. Le CPT `videos` n'expose pas d'extrait. Les métadonnées YouTube d'origine restent dans l'état local et dans la sauvegarde, pas dans la page.

Sans clé, une reformulation locale nettoie le titre et garde les phrases déjà présentes dans la description. Avec `YT_EDITORIAL_AI=1`, une seule requête est faite au moment de la création. Une réponse qui ajoute un nom ou une date absents des métadonnées est écartée. Si l'API échoue, la vidéo est quand même créée avec le secours local.

Copier aussi `editorial.py`, `editorial_backfill.py` et le dossier `packs/` à côté de `yt_wp_sync.py`. Ne pas régénérer le fichier d'environnement : y ajouter seulement les variables nouvelles. `YT_EDITORIAL_AI` reste à `0` tant que la clé OpenAI n'est pas posée.

Les 87 vidéos historiques reçoivent les textes du fichier validé, sans nouvelle génération. Le compte est un administrateur ou un éditeur, jamais `youtube-sync`. Une vidéo est laissée intacte si son titre ou son contenu n'est plus celui importé. Les six fiches `requires_review` sont seulement signalées.

```bash
sudo cp sync/youtube-wordpress/yt_wp_sync.py \
  sync/youtube-wordpress/editorial.py \
  sync/youtube-wordpress/editorial_backfill.py \
  /opt/lintelligent-yt-sync/
sudo cp sync/youtube-wordpress/packs/lintelligent_tv_87_replays_editorial.json \
  /var/lib/lintelligent-yt-sync/
sudo cp -a /var/lib/lintelligent-yt-sync/state.json \
  /var/lib/lintelligent-yt-sync/state.json.before-editorial
```

Dry-run, sans écriture :

```bash
sudo -u yt-sync /usr/bin/python3 /opt/lintelligent-yt-sync/yt_wp_sync.py \
  --editorial-pack /var/lib/lintelligent-yt-sync/lintelligent_tv_87_replays_editorial.json \
  --dry-run \
  --env-file /etc/lintelligent/youtube-sync.env \
  --report /var/lib/lintelligent-yt-sync/editorial-dry-run.json
```

Après validation du rapport, poser `YT_EDITORIAL_APPLY=1` et les identifiants `WP_EDITORIAL_USER` / `WP_EDITORIAL_APP_PASSWORD`, puis :

```bash
sudo -u yt-sync /usr/bin/python3 /opt/lintelligent-yt-sync/yt_wp_sync.py \
  --editorial-pack /var/lib/lintelligent-yt-sync/lintelligent_tv_87_replays_editorial.json \
  --apply \
  --env-file /etc/lintelligent/youtube-sync.env
```

La commande écrit d'abord `editorial-backup-DATE.json` et une ligne par vidéo dans `editorial.log`. Elle ne change pas `import_after`. La restauration ne renvoie que le titre et le contenu :

```bash
sudo -u yt-sync /usr/bin/python3 /opt/lintelligent-yt-sync/yt_wp_sync.py \
  --editorial-restore --dry-run \
  --backup /var/lib/lintelligent-yt-sync/editorial-backup-DATE.json \
  --env-file /etc/lintelligent/youtube-sync.env
```

Pour les vidéos suivantes, passer `YT_EDITORIAL_AI=1` et renseigner `YT_EDITORIAL_API_KEY` dans le même fichier. Le timer n'a pas à être recréé : au prochain passage il crée les vidéos manquantes avec un titre et un résumé, une seule fois. Contrôle :

```bash
systemctl status lintelligent-yt-sync.timer --no-pager
journalctl -u lintelligent-yt-sync.service -n 80 --no-pager
```

Le modèle `gpt-4o-mini` coûte de l'ordre d'un centime pour une centaine de vidéos courtes. Aucune génération n'est répétée à l'affichage du site ni à chaque passage du timer sur une vidéo déjà créée.

## Reportages

La catégorie est lue dans WordPress par son slug `reportages`. Son identifiant n'est pas écrit dans le script. Une émission reconnue conserve sa catégorie. Un titre ambigu reste Non classé. Une vidéo sans émission reconnue reçoit Reportages à la création. La commande ne crée pas de catégorie.

Le compte `youtube-sync` peut seulement rattacher une catégorie existante au moment de la création. Le reclassement des vidéos déjà publiées utilise le compte éditorial. Le timer de 10 minutes n'est pas modifié.

```bash
cd /opt/lintelligent-yt-sync
python3 yt_wp_sync.py --reportages --dry-run \
  --env-file /etc/lintelligent/youtube-sync.env \
  --state-dir /var/lib/lintelligent-yt-sync \
  --report /var/lib/lintelligent-yt-sync/reportages-dry-run.json
```

Après lecture du rapport, et seulement alors :

```bash
YT_EDITORIAL_APPLY=1 python3 yt_wp_sync.py --reportages --apply \
  --env-file /etc/lintelligent/youtube-sync.env \
  --state-dir /var/lib/lintelligent-yt-sync
```

La restauration ne renvoie que les catégories :

```bash
python3 yt_wp_sync.py --reportages-restore --dry-run \
  --backup /var/lib/lintelligent-yt-sync/reportages-backup-DATE.json \
  --env-file /etc/lintelligent/youtube-sync.env
```
