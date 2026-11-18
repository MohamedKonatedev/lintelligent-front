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

Un dépassement de quota YouTube termine avec le code 75, sans avancer de publication. Le passage suivant reprend les vidéos non créées. Cinq créations maximum par passage.

Sauvegarde utile : `/var/lib/lintelligent-yt-sync/state.json`. S'il disparaît, les vidéos encore publiques restent protégées par `lien_video`. Une vidéo passée en brouillon après coup ne l'est plus, si l'état a aussi été perdu.
