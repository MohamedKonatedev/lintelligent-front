#!/usr/bin/env python3
"""Correction rétroactive des vidéos déjà importées.

Cette commande n'utilise pas le compte youtube-sync. Le rôle yt_sync reste
interdit de modification sur les vidéos existantes.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import editorial


def update_video_text(sync, http, origin: str, auth: dict[str, str], wp_id: int, title: str, content: str) -> None:
    headers = {**auth, "Content-Type": "application/json"}
    result = http.request(
        "POST",
        f"{sync.wp_api_base(origin)}/videos/{int(wp_id)}",
        headers=headers,
        body=json.dumps({"title": title, "content": content}).encode("utf-8"),
    )
    if result.status not in {200, 201}:
        raise sync.SyncError(f"mise à jour vidéo {wp_id} HTTP {result.status}", sync.EXIT_WP)


def fetch_video(sync, http, origin: str, wp_id: int, auth: dict[str, str] | None) -> dict | None:
    result = http.request(
        "GET",
        f"{sync.wp_api_base(origin)}/videos/{int(wp_id)}"
        "?_fields=id,date_gmt,modified_gmt,title,content,acf,categories,featured_media,status",
        headers=auth,
    )
    if result.status == 404:
        return None
    if result.status != 200:
        raise sync.SyncError(f"lecture vidéo {wp_id} HTTP {result.status}", sync.EXIT_WP)
    payload = result.json()
    if not isinstance(payload, dict):
        raise sync.SyncError(f"vidéo {wp_id} illisible", sync.EXIT_WP)
    return payload


def raw_field(field: object) -> str:
    if isinstance(field, dict):
        if isinstance(field.get("raw"), str) and field.get("raw"):
            return str(field["raw"])
        return str(field.get("rendered") or "")
    return str(field or "")


def assert_editorial_account(sync, profile: dict, sync_user: str) -> None:
    roles = profile.get("roles") if isinstance(profile.get("roles"), list) else []
    name = str(profile.get("name") or "")
    if "yt_sync" in roles or name == "youtube-sync" or (sync_user and sync_user == name):
        raise sync.SyncError(
            "le compte de synchronisation ne peut pas modifier les vidéos existantes",
            sync.EXIT_CONFIG,
        )
    if "administrator" not in roles and "editor" not in roles:
        raise sync.SyncError("le compte éditorial doit être administrateur ou éditeur", sync.EXIT_CONFIG)


def credentials(sync, env: dict[str, str]) -> dict[str, str] | None:
    user = env.get("WP_EDITORIAL_USER") or ""
    password = env.get("WP_EDITORIAL_APP_PASSWORD") or ""
    if not user and not password:
        return None
    if user == "youtube-sync" or (env.get("WP_USER") and user == env.get("WP_USER")):
        raise sync.SyncError("la correction rétroactive ne peut pas utiliser le compte youtube-sync", sync.EXIT_CONFIG)
    if not user or not password:
        raise sync.SyncError("compte éditorial incomplet", sync.EXIT_CONFIG)
    return sync.basic_auth_header(user, password)


def show_name(sync, post: dict, emissions: list) -> str | None:
    categories = post.get("categories") if isinstance(post.get("categories"), list) else []
    by_id = {emission.term_id: emission.names[0] for emission in emissions}
    for category_id in categories:
        if isinstance(category_id, int) and category_id in by_id:
            return by_id[category_id]
    return None


def diffusion_moment(sync, post: dict, zone: ZoneInfo) -> datetime:
    acf = post.get("acf") if isinstance(post.get("acf"), dict) else {}
    raw = str(acf.get("date_diffusion") or "")
    if len(raw) == 8 and raw.isdigit():
        return datetime(int(raw[0:4]), int(raw[4:6]), int(raw[6:8]), tzinfo=zone)
    return sync.parse_rfc3339(str(post.get("date_gmt") or ""))


def stamp(sync, state: dict, video_id: str, copy: editorial.EditorialCopy, title: str, description: str) -> None:
    import_after = state.get("import_after")
    bootstrapped_at = state.get("bootstrapped_at")
    synced = state.get("synced")
    if not isinstance(synced, dict) or not isinstance(synced.get(video_id), dict):
        raise sync.SyncError("entrée d'état introuvable", sync.EXIT_CONFIG)
    entry = synced[video_id]
    entry["youtube_title"] = title
    entry["youtube_description"] = description[:8000]
    entry["editorial_title"] = copy.title
    entry["editorial_summary"] = copy.summary
    entry["editorial_method"] = copy.method
    entry["editorial_needs_review"] = copy.needs_review
    entry["editorial_applied_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if state.get("import_after") != import_after or state.get("bootstrapped_at") != bootstrapped_at:
        raise sync.SyncError("le repère automatique a été modifié", sync.EXIT_ERROR)


def execute(args, sync) -> int:
    env = sync.env_settings()
    origin = (env.get("WP_BASE_URL") or sync.DEFAULT_WP_BASE).rstrip("/")
    zone = ZoneInfo(env.get("YT_SYNC_TIMEZONE") or sync.DEFAULT_TIMEZONE)
    state_dir_raw = str(args.state_dir or env.get("YT_SYNC_STATE_DIR") or "")
    if not state_dir_raw:
        raise sync.SyncError("dossier d'état requis pour identifier les vidéos importées", sync.EXIT_CONFIG)
    state_path, lock_path = sync.state_paths(Path(state_dir_raw))
    state = sync.load_state(state_path)
    tracked = state.get("synced") if isinstance(state.get("synced"), dict) else {}
    auth = credentials(sync, env)
    if args.apply:
        if env.get("YT_EDITORIAL_APPLY") != "1":
            raise sync.SyncError("YT_EDITORIAL_APPLY doit valoir 1", sync.EXIT_CONFIG)
        if auth is None:
            raise sync.SyncError("WP_EDITORIAL_USER et WP_EDITORIAL_APP_PASSWORD sont requis", sync.EXIT_CONFIG)
    http = sync.HttpClient(allow_write=bool(args.apply))
    if args.apply and auth is not None:
        assert_editorial_account(sync, sync.auth_check(http, origin, auth), env.get("WP_USER") or "")
    emissions, _extras, _missing = sync.fetch_emission_catalog(http, origin)
    ai = editorial.ai_settings_from_env(env, requested=bool(args.with_ai))
    rows: list[dict[str, object]] = []
    planned: list[dict[str, object]] = []
    for video_id, entry in tracked.items():
        if not isinstance(entry, dict) or not sync.YOUTUBE_ID_RE.fullmatch(str(video_id)):
            continue
        wp_id = entry.get("wp_id")
        if not isinstance(wp_id, int):
            rows.append({"video_id": video_id, "decision": "skip-missing"})
            continue
        post = fetch_video(sync, http, origin, wp_id, auth if args.apply else None)
        if post is None:
            rows.append({"video_id": video_id, "wp_id": wp_id, "decision": "skip-missing"})
            continue
        acf = post.get("acf") if isinstance(post.get("acf"), dict) else {}
        if sync.extract_youtube_id(str(acf.get("lien_video") or "")) != video_id:
            rows.append({"video_id": video_id, "wp_id": wp_id, "decision": "skip-id-mismatch"})
            continue
        current_title = editorial.plain_text(raw_field(post.get("title")))
        decision = editorial.classify_backfill(
            entry,
            {"title": current_title, "modified_gmt": post.get("modified_gmt"), "date_gmt": post.get("date_gmt")},
            include_timer=bool(args.include_timer),
        )
        if decision != "update":
            rows.append({"video_id": video_id, "wp_id": wp_id, "decision": decision, "title": current_title})
            continue
        description = editorial.plain_text(raw_field(post.get("content")))
        source = editorial.EditorialSource(
            youtube_title=current_title,
            youtube_description=description,
            show_name=show_name(sync, post, emissions),
            published_at=diffusion_moment(sync, post, zone),
            zone=zone,
        )
        copy = editorial.compose_editorial(source, ai)
        rows.append(
            {
                "video_id": video_id,
                "wp_id": wp_id,
                "decision": "update",
                "method": copy.method,
                "needs_review": copy.needs_review,
                "note": copy.note,
                "before_title": current_title,
                "after_title": copy.title,
                "before_summary": description[:500],
                "after_summary": copy.summary,
            }
        )
        planned.append(
            {
                "video_id": video_id,
                "wp_id": wp_id,
                "title": raw_field(post.get("title")),
                "content": raw_field(post.get("content")),
                "categories": post.get("categories"),
                "acf": acf,
                "featured_media": post.get("featured_media"),
                "date_gmt": post.get("date_gmt"),
                "modified_gmt": post.get("modified_gmt"),
                "copy": copy,
                "youtube_title": current_title,
                "youtube_description": description,
            }
        )
    report: dict[str, object] = {
        "mode": "editorial-apply" if args.apply else "editorial-dry-run",
        "writes": False,
        "ai": bool(ai),
        "tracked": len(tracked),
        "to_update": sum(1 for row in rows if row["decision"] == "update"),
        "decisions": rows,
        "notes": [
            "Seules les vidéos présentes dans l'état du synchroniseur sont candidates.",
            "Les vidéos antérieures, absentes de cet état, ne sont pas modifiées.",
            "Le rôle yt_sync reste incapable de modifier une vidéo existante.",
            "import_after n'est pas modifié.",
        ],
    }
    if not ai:
        report["notes"].append("Aperçu sans IA : reformulation locale des métadonnées.")
    if args.apply and planned:
        stamp_name = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup_path = Path(state_dir_raw) / f"editorial-backup-{stamp_name}.json"
        backup_path.write_text(
            json.dumps(
                {
                    "created_at": stamp_name,
                    "items": [{key: value for key, value in item.items() if key != "copy"} for item in planned],
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        sync.LOG.info("sauvegarde éditoriale : %s", backup_path)
        log_path = Path(state_dir_raw) / "editorial.log"
        with sync.exclusive_lock(lock_path):
            state = sync.load_state(state_path)
            assert auth is not None
            for item in planned:
                copy = item["copy"]
                assert isinstance(copy, editorial.EditorialCopy)
                update_video_text(
                    sync,
                    http,
                    origin,
                    auth,
                    int(item["wp_id"]),
                    copy.title,
                    editorial.editorial_paragraph(copy.summary),
                )
                stamp(sync, state, str(item["video_id"]), copy, str(item["youtube_title"]), str(item["youtube_description"]))
                sync.save_state(state_path, state)
                report["writes"] = True
                with log_path.open("a", encoding="utf-8") as handle:
                    handle.write(
                        json.dumps(
                            {
                                "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                                "wp_id": item["wp_id"],
                                "video_id": item["video_id"],
                                "method": copy.method,
                                "title": copy.title,
                            },
                            ensure_ascii=False,
                        )
                        + "\n"
                    )
                sync.LOG.info("réécrit wp_id=%s youtube=%s", item["wp_id"], item["video_id"])
    if args.report:
        Path(args.report).parent.mkdir(parents=True, exist_ok=True)
        Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    json.dump(report, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    sync.LOG.info("éditorial mode=%s a_modifier=%s", report["mode"], report["to_update"])
    return sync.EXIT_OK


def execute_pack(args, sync) -> int:
    """Applique les textes du fichier validé. Aucune génération."""
    env = sync.env_settings()
    origin = (env.get("WP_BASE_URL") or sync.DEFAULT_WP_BASE).rstrip("/")
    if not args.editorial_pack:
        raise sync.SyncError("fichier éditorial requis", sync.EXIT_CONFIG)
    try:
        items = editorial.load_editorial_pack(json.loads(Path(args.editorial_pack).read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise sync.SyncError(f"fichier éditorial refusé : {exc}", sync.EXIT_CONFIG) from exc
    state_dir_raw = str(args.state_dir or env.get("YT_SYNC_STATE_DIR") or "")
    if not state_dir_raw:
        raise sync.SyncError("dossier d'état requis pour identifier les vidéos importées", sync.EXIT_CONFIG)
    state_path, lock_path = sync.state_paths(Path(state_dir_raw))
    state = sync.load_state(state_path)
    tracked = state.get("synced") if isinstance(state.get("synced"), dict) else {}
    preserved_after = state.get("import_after")
    auth = credentials(sync, env)
    if args.apply:
        if env.get("YT_EDITORIAL_APPLY") != "1":
            raise sync.SyncError("YT_EDITORIAL_APPLY doit valoir 1", sync.EXIT_CONFIG)
        if auth is None:
            raise sync.SyncError("WP_EDITORIAL_USER et WP_EDITORIAL_APP_PASSWORD sont requis", sync.EXIT_CONFIG)
    http = sync.HttpClient(allow_write=bool(args.apply))
    if args.apply and auth is not None:
        assert_editorial_account(sync, sync.auth_check(http, origin, auth), env.get("WP_USER") or "")
    rows: list[dict[str, object]] = []
    planned: list[dict[str, object]] = []
    for item in items:
        entry = tracked.get(item["youtube_id"])
        in_state = (
            isinstance(entry, dict)
            and entry.get("wp_id") == item["wp_id"]
            and str(entry.get("source") or "") == "history"
        )
        post_view = None
        post = None
        raw_title = ""
        raw_content = ""
        acf: dict = {}
        if in_state:
            post = fetch_video(sync, http, origin, int(item["wp_id"]), auth if args.apply else None)
            if post is not None:
                acf = post.get("acf") if isinstance(post.get("acf"), dict) else {}
                raw_title = raw_field(post.get("title"))
                raw_content = raw_field(post.get("content"))
                post_view = {
                    "title": editorial.plain_text(raw_title),
                    "content": raw_content,
                    "youtube_id": sync.extract_youtube_id(str(acf.get("lien_video") or "")) or "",
                }
        decision = editorial.classify_pack_item(
            item,
            post_view,
            in_state=in_state,
            include_review=bool(args.include_review),
        )
        rows.append(
            {
                "wp_id": item["wp_id"],
                "youtube_id": item["youtube_id"],
                "decision": decision,
                "requires_review": bool(item.get("requires_review")),
                "review_note": item.get("review_note") or "",
                "before_title": editorial.plain_text(raw_title) if raw_title else item.get("original_title"),
                "after_title": item["title"] if decision == "update" else "",
                "after_summary": item["summary"] if decision == "update" else "",
            }
        )
        if decision != "update" or post_view is None:
            continue
        planned.append(
            {
                "wp_id": item["wp_id"],
                "youtube_id": item["youtube_id"],
                "title": raw_title,
                "content": raw_content,
                "categories": post.get("categories") if post else [],
                "acf": acf,
                "featured_media": post.get("featured_media") if post else None,
                "new_title": str(item["title"]),
                "new_summary": str(item["summary"]),
                "original_title": str(item["original_title"]),
                "original_summary": str(item["original_summary"]),
            }
        )
    report: dict[str, object] = {
        "mode": "editorial-pack-apply" if args.apply else "editorial-pack-dry-run",
        "writes": False,
        "generated": False,
        "pack_count": len(items),
        "to_update": sum(1 for row in rows if row["decision"] == "update"),
        "held_for_review": sum(1 for row in rows if row["decision"] == "skip-review"),
        "import_after": preserved_after,
        "decisions": rows,
        "notes": [
            "Les textes viennent exclusivement du fichier validé.",
            "Les fiches requires_review ne sont pas appliquées sans --include-review.",
            "Seuls le titre et le contenu sont envoyés.",
            "Les vidéos absentes de l'import historique ne sont pas modifiées.",
            "import_after n'est pas modifié.",
        ],
    }
    if args.apply and planned:
        stamp_name = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup_path = Path(state_dir_raw) / f"editorial-backup-{stamp_name}.json"
        backup_path.write_text(
            json.dumps(
                {
                    "created_at": stamp_name,
                    "items": [
                        {key: value for key, value in item.items() if key not in {"new_title", "new_summary"}}
                        for item in planned
                    ],
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        sync.LOG.info("sauvegarde éditoriale : %s", backup_path)
        log_path = Path(state_dir_raw) / "editorial.log"
        with sync.exclusive_lock(lock_path):
            state = sync.load_state(state_path)
            if state.get("import_after") != preserved_after:
                raise sync.SyncError("import_after a changé pendant la correction", sync.EXIT_ERROR)
            assert auth is not None
            for item in planned:
                copy = editorial.EditorialCopy(
                    title=str(item["new_title"]),
                    summary=str(item["new_summary"]),
                    method="pack",
                    needs_review=False,
                    note="Texte validé dans le fichier éditorial.",
                )
                update_video_text(
                    sync,
                    http,
                    origin,
                    auth,
                    int(item["wp_id"]),
                    copy.title,
                    editorial.editorial_paragraph(copy.summary),
                )
                stamp(
                    sync,
                    state,
                    str(item["youtube_id"]),
                    copy,
                    str(item["original_title"]),
                    str(item["original_summary"]),
                )
                if state.get("import_after") != preserved_after:
                    raise sync.SyncError("import_after a été modifié", sync.EXIT_ERROR)
                sync.save_state(state_path, state)
                report["writes"] = True
                with log_path.open("a", encoding="utf-8") as handle:
                    handle.write(
                        json.dumps(
                            {
                                "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                                "wp_id": item["wp_id"],
                                "video_id": item["youtube_id"],
                                "method": "pack",
                                "title": copy.title,
                            },
                            ensure_ascii=False,
                        )
                        + "\n"
                    )
                sync.LOG.info("texte validé appliqué wp_id=%s", item["wp_id"])
    if args.report:
        Path(args.report).parent.mkdir(parents=True, exist_ok=True)
        Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    json.dump(report, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    sync.LOG.info(
        "paquet mode=%s fiches=%s a_modifier=%s en_revue=%s",
        report["mode"],
        report["pack_count"],
        report["to_update"],
        report["held_for_review"],
    )
    return sync.EXIT_OK


def execute_restore(args, sync) -> int:
    env = sync.env_settings()
    origin = (env.get("WP_BASE_URL") or sync.DEFAULT_WP_BASE).rstrip("/")
    if not args.backup:
        raise sync.SyncError("fichier de sauvegarde requis", sync.EXIT_CONFIG)
    payload = json.loads(Path(args.backup).read_text(encoding="utf-8"))
    items = payload.get("items") if isinstance(payload, dict) else None
    if not isinstance(items, list):
        raise sync.SyncError("sauvegarde illisible", sync.EXIT_CONFIG)
    preview = []
    for item in items:
        if isinstance(item, dict):
            body = editorial.restore_body(item)
            preview.append({"wp_id": item.get("wp_id"), "title": body["title"]})
    if not args.apply:
        json.dump(
            {"mode": "editorial-restore-dry-run", "writes": False, "items": preview},
            sys.stdout,
            ensure_ascii=False,
            indent=2,
        )
        sys.stdout.write("\n")
        return sync.EXIT_OK
    if env.get("YT_EDITORIAL_APPLY") != "1":
        raise sync.SyncError("YT_EDITORIAL_APPLY doit valoir 1", sync.EXIT_CONFIG)
    auth = credentials(sync, env)
    if auth is None:
        raise sync.SyncError("compte éditorial requis", sync.EXIT_CONFIG)
    http = sync.HttpClient(allow_write=True)
    assert_editorial_account(sync, sync.auth_check(http, origin, auth), env.get("WP_USER") or "")
    for item in items:
        if not isinstance(item, dict):
            continue
        body = editorial.restore_body(item)
        update_video_text(sync, http, origin, auth, int(item["wp_id"]), body["title"], body["content"])
        sync.LOG.info("restauré wp_id=%s", item.get("wp_id"))
    json.dump(
        {"mode": "editorial-restore", "writes": True, "count": len(preview)},
        sys.stdout,
        ensure_ascii=False,
        indent=2,
    )
    sys.stdout.write("\n")
    return sync.EXIT_OK
