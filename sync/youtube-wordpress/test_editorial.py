#!/usr/bin/env python3
"""Contrôles de la réécriture éditoriale. Aucun appel réseau."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
import editorial
import editorial_backfill
import yt_wp_sync as sync


ZONE = ZoneInfo("Africa/Abidjan")
WHEN = datetime(2026, 10, 8, 12, 0, tzinfo=timezone.utc)


def source(**overrides: object) -> editorial.EditorialSource:
    data: dict[str, object] = {
        "youtube_title": "L'INVITÉ AVEC KAJEEM : les médias face à l'intelligence artificielle",
        "youtube_description": (
            "Kajeem revient sur les enjeux de l'intelligence artificielle dans les médias "
            "et la lutte contre la désinformation. Abonnez-vous et écrivez-nous sur WhatsApp."
        ),
        "show_name": "L’invité",
        "published_at": WHEN,
        "zone": ZONE,
    }
    data.update(overrides)
    return editorial.EditorialSource(**data)  # type: ignore[arg-type]


class EditorialTests(unittest.TestCase):
    def test_show_title_uses_known_guest_and_broadcast_date(self) -> None:
        copy = editorial.fallback_editorial(source())
        self.assertEqual(copy.title, "L’invité du 8 octobre 2026 avec Kajeem")
        self.assertNotIn("WhatsApp", copy.summary)
        self.assertNotIn("Abonnez", copy.summary)
        self.assertIn("désinformation", copy.summary)
        self.assertEqual(copy.method, "fallback")

    def test_prefix_and_capitals_are_removed_without_new_facts(self) -> None:
        copy = editorial.fallback_editorial(
            source(
                youtube_title="Titre : VAGONDO RÉAFFIRME LA POURSUITE DU DIALOGUE POLITIQUE",
                youtube_description=(
                    "Le ministre de l’Intérieur, Vagondo Diomandé, a assuré que le dialogue "
                    "avec les acteurs politiques n’a jamais été interrompu."
                ),
                show_name=None,
            )
        )
        self.assertFalse(copy.title.lower().startswith("titre"))
        self.assertNotEqual(copy.title, copy.title.upper())
        self.assertIn("Vagondo", copy.title)
        self.assertIn("Vagondo", copy.summary)

    def test_unknown_subject_is_flagged_instead_of_invented(self) -> None:
        copy = editorial.fallback_editorial(
            source(
                youtube_title="À VOUS LA PAROLE",
                youtube_description="Abonnez-vous à la chaîne. WhatsApp : 0700000000",
                show_name="À vous la parole",
                published_at=datetime(2026, 10, 22, 12, 0, tzinfo=timezone.utc),
            )
        )
        self.assertEqual(copy.title, "À vous la parole du 22 octobre 2026")
        self.assertNotIn("0700000000", copy.summary)
        self.assertTrue(copy.needs_review)
        self.assertIn("Vérification", copy.note)

    def test_ai_copy_with_an_unknown_name_is_rejected(self) -> None:
        invented = editorial.EditorialCopy(
            title="L’invité du 8 octobre 2026 avec Kajeem",
            summary="Kajeem dialogue avec Camille Inventé au sujet de la blockchain mondiale et de ses effets.",
            method="ai",
            needs_review=False,
            note="",
        )
        self.assertIsNone(editorial.validate_copy(invented, source()))

    def test_ai_copy_limited_to_source_facts_is_kept(self) -> None:
        accepted = editorial.EditorialCopy(
            title="L’invité du 8 octobre 2026 avec Kajeem",
            summary=(
                "Kajeem revient sur les enjeux de l'intelligence artificielle dans les médias "
                "et la lutte contre la désinformation face aux médias."
            ),
            method="ai",
            needs_review=False,
            note="",
        )
        checked = editorial.validate_copy(accepted, source())
        self.assertIsNotNone(checked)
        assert checked is not None
        self.assertEqual(checked.method, "ai")
        self.assertFalse(checked.needs_review)

    def test_ai_failure_keeps_a_publishable_fallback(self) -> None:
        copy = editorial.compose_editorial(source(), ai=None)
        self.assertEqual(copy.method, "fallback")
        self.assertTrue(copy.title)
        self.assertTrue(copy.summary)

    def test_backfill_protects_manual_edits_and_other_sources(self) -> None:
        created = "2026-11-18T11:00:07"
        post = {"title": "Titre brut", "date_gmt": created, "modified_gmt": created}
        entry = {"source": "history", "wp_id": 10}
        self.assertEqual(editorial.classify_backfill(entry, post, include_timer=False), "update")
        manual = dict(post)
        manual["modified_gmt"] = "2026-11-18T12:00:07"
        self.assertEqual(editorial.classify_backfill(entry, manual, include_timer=False), "skip-manual")
        self.assertEqual(
            editorial.classify_backfill({"source": "timer", "wp_id": 10}, post, include_timer=False),
            "skip-not-history",
        )
        done = dict(entry)
        done["editorial_applied_at"] = created
        done["editorial_title"] = "Titre brut"
        self.assertEqual(editorial.classify_backfill(done, post, include_timer=False), "skip-already")

    def test_restore_touches_only_title_and_content(self) -> None:
        body = editorial.restore_body(
            {"title": "Ancien titre", "content": "<p>Ancien texte</p>", "acf": {"lien_video": "https://youtu.be/abc"}}
        )
        self.assertEqual(set(body), {"title", "content"})

    def test_new_post_uses_editorial_text_and_keeps_acf(self) -> None:
        video = sync.NormalizedVideo(
            video_id="iAkpq0dqTNs",
            title="TITRE BRUT",
            description="Abonnez-vous sur https://example.com",
            published_at=WHEN,
            thumbnail_urls=(),
            duration_display="12:50",
            privacy_status="public",
            upload_status="processed",
            live_broadcast_content="none",
            live_ended=True,
            embeddable=True,
            source="api",
        )
        action = sync.Action(video, "create", "eligible", category_status="matched", category_name="L’invité", category_id=3)
        prepared = sync.with_editorial(action, ZONE, None)
        body = sync.build_post_body(
            video,
            ZONE,
            featured_media=9,
            category_id=3,
            editorial_title=prepared.editorial_title,
            editorial_summary=prepared.editorial_summary,
        )
        self.assertEqual(body["title"], "L’invité du 8 octobre 2026")
        self.assertNotIn("example.com", str(body["content"]))
        self.assertEqual(body["acf"]["lien_video"], "https://www.youtube.com/watch?v=iAkpq0dqTNs")
        self.assertEqual(body["acf"]["duree"], "12:50")
        self.assertEqual(body["categories"], [3])
        self.assertEqual(body["featured_media"], 9)

    def test_state_records_original_text_without_moving_watermark(self) -> None:
        state = {"import_after": "2026-11-18T12:00:00Z", "bootstrapped_at": "2026-11-18T12:00:00Z", "synced": {}}
        copy = editorial.fallback_editorial(source())
        sync.remember_created(state, "iAkpq0dqTNs", 20, True, "history", copy=copy, youtube_title="brut", youtube_description="desc")
        self.assertEqual(state["import_after"], "2026-11-18T12:00:00Z")
        saved = state["synced"]["iAkpq0dqTNs"]
        self.assertEqual(saved["youtube_title"], "brut")
        self.assertEqual(saved["editorial_title"], copy.title)

    def test_sync_role_still_cannot_edit_existing_videos(self) -> None:
        php = Path(__file__).with_name("wordpress").joinpath("yt-sync-role.php").read_text(encoding="utf-8")
        self.assertIn("aucune mise à jour d'une vidéo existante", php)
        self.assertIn("return array('do_not_allow');", php)
        self.assertNotIn("'edit_published_posts' => true", php)

    def test_editorial_command_refuses_the_sync_account(self) -> None:
        with self.assertRaises(sync.SyncError):
            editorial_backfill.credentials(sync, {"WP_EDITORIAL_USER": "youtube-sync", "WP_EDITORIAL_APP_PASSWORD": "xxxx"})

    def test_editorial_dry_run_needs_a_state_and_writes_nothing(self) -> None:
        saved = os.environ.get("YT_SYNC_STATE_DIR")
        os.environ.pop("YT_SYNC_STATE_DIR", None)
        try:
            self.assertEqual(sync.main(["--editorial", "--dry-run"]), sync.EXIT_CONFIG)
        finally:
            if saved is not None:
                os.environ["YT_SYNC_STATE_DIR"] = saved

    def test_editorial_apply_is_refused_without_explicit_flag(self) -> None:
        saved = {key: os.environ.get(key) for key in ("YT_EDITORIAL_APPLY", "YT_SYNC_STATE_DIR")}
        os.environ.pop("YT_EDITORIAL_APPLY", None)
        try:
            with tempfile.TemporaryDirectory() as tmp:
                (Path(tmp) / "state.json").write_text(
                    json.dumps({"import_after": "2026-11-18T12:00:00Z", "synced": {}}),
                    encoding="utf-8",
                )
                code = sync.main(["--editorial", "--apply", "--state-dir", tmp])
                self.assertEqual(code, sync.EXIT_CONFIG)
                self.assertFalse(list(Path(tmp).glob("editorial-backup-*.json")))
        finally:
            for key, value in saved.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value


if __name__ == "__main__":
    unittest.main()
