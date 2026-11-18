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
        entry = {
            "source": "history",
            "wp_id": 10,
            "youtube_title": "Titre brut",
            "youtube_description": "Le ministre Vagondo confirme le dialogue politique avec les acteurs.",
        }
        post = {
            "title": "Titre brut",
            "content": "<p>Le ministre Vagondo confirme le dialogue politique avec les acteurs. Suite du sujet.</p>",
            "date_gmt": created,
            "modified_gmt": "2026-11-19T18:00:00",
        }
        self.assertEqual(editorial.classify_backfill(entry, post, include_timer=False), "update")
        manual = dict(post, title="Titre réécrit à la main")
        self.assertEqual(editorial.classify_backfill(entry, manual, include_timer=False), "skip-manual")
        self.assertEqual(
            editorial.classify_backfill({"source": "timer", "wp_id": 10}, post, include_timer=False),
            "skip-not-history",
        )
        self.assertEqual(
            editorial.classify_backfill({"source": "history", "wp_id": 10}, post, include_timer=False),
            "skip-unverified",
        )
        done = dict(entry, editorial_applied_at=created, editorial_title="Titre brut")
        self.assertEqual(editorial.classify_backfill(done, post, include_timer=False), "skip-already")

    def test_acronyms_and_proper_names_keep_their_case(self) -> None:
        copy = editorial.fallback_editorial(
            source(
                youtube_title="FIF YACINE IDRISS DIALLO RÉÉLU AVEC 123 VOIX SUR 149",
                youtube_description=(
                    "Yacine Idriss Diallo a été réélu à la présidence de la Fédération ivoirienne "
                    "de football (FIF). La CNPS, la NISA, la SOTRA et JT OFF sont cités dans le débat."
                ),
                show_name=None,
            )
        )
        self.assertIn("FIF", copy.title)
        self.assertIn("Yacine Idriss Diallo", copy.title)
        self.assertNotIn("Fif", copy.title)
        self.assertNotIn("yacine", copy.title)
        self.assertNotIn("http", copy.summary.lower())
        self.assertNotIn("abonnez", copy.summary.lower())

    def test_invitee_uses_the_feminine_show_title(self) -> None:
        copy = editorial.fallback_editorial(
            source(
                youtube_title="L'INVITÉE AVEC AMINATA TRAORÉ",
                youtube_description="Aminata Traoré revient sur la rentrée scolaire et les familles.",
                show_name="L’invité",
            )
        )
        self.assertTrue(copy.title.startswith("L'invitée du 8 octobre 2026 avec Aminata Traoré"))

    def test_known_shows_match_title_variants(self) -> None:
        paired, _extras, _missing = sync.pair_emissions(
            [
                {"id": 3, "slug": "linvite", "name": "L’invité"},
                {"id": 2, "slug": "a-vous-la-parole", "name": "À vous la parole"},
                {"id": 7, "slug": "les-entretiens", "name": "Les Entretiens"},
            ]
        )
        self.assertEqual(sync.match_emission("L'invitée avec Awa", paired).status, "matched")
        self.assertEqual(sync.match_emission("à vous la parole", paired).emission.slug, "a-vous-la-parole")  # type: ignore[union-attr]
        self.assertEqual(sync.match_emission("les entretiens du soir", paired).emission.slug, "les-entretiens")  # type: ignore[union-attr]

    def test_api_error_uses_the_local_fallback(self) -> None:
        settings = editorial.AiSettings(
            url="https://example.invalid/v1/chat/completions",
            model="gpt-4o-mini",
            api_key="test-key",
            timeout=1,
        )
        original = editorial.urllib.request.urlopen

        def boom(*_args: object, **_kwargs: object) -> object:
            raise editorial.urllib.error.URLError("indisponible")

        editorial.urllib.request.urlopen = boom  # type: ignore[assignment]
        try:
            copy = editorial.compose_editorial(source(), settings)
        finally:
            editorial.urllib.request.urlopen = original
        self.assertEqual(copy.method, "fallback")
        self.assertTrue(copy.needs_review)
        self.assertIn("IA", copy.note)

    def test_validated_pack_skips_review_manual_and_unknown_posts(self) -> None:
        item = {
            "wp_id": 316,
            "youtube_id": "3sXKeW4aAWo",
            "original_title": "À VOUS LA PAROLE AVEC FOOD’S CO",
            "original_summary": "À Béoumi, Sanogo Tahirou a fait le pari de la transformation locale.",
            "title": "À vous la parole du 16 novembre 2026 avec Sanogo Tahirou",
            "summary": "À Béoumi, Sanogo Tahirou présente l’histoire de FOOD’S CO et son impact local.",
            "requires_review": True,
        }
        post = {
            "title": item["original_title"],
            "content": "<p>À Béoumi, Sanogo Tahirou a fait le pari de la transformation locale. Suite.</p>",
            "youtube_id": "3sXKeW4aAWo",
        }
        self.assertEqual(editorial.classify_pack_item(item, post, in_state=True, include_review=False), "skip-review")
        ready = dict(item, requires_review=False)
        self.assertEqual(editorial.classify_pack_item(ready, post, in_state=True, include_review=False), "update")
        self.assertEqual(
            editorial.classify_pack_item(ready, dict(post, title="Titre modifié"), in_state=True, include_review=False),
            "skip-manual",
        )
        self.assertEqual(editorial.classify_pack_item(ready, post, in_state=False, include_review=False), "skip-not-imported")
        self.assertEqual(
            editorial.classify_pack_item(ready, dict(post, youtube_id="aaaaaaaaaaa"), in_state=True, include_review=False),
            "skip-id-mismatch",
        )
        pack = editorial.load_editorial_pack(
            json.loads(Path(__file__).with_name("packs").joinpath("lintelligent_tv_87_replays_editorial.json").read_text(encoding="utf-8"))
        )
        self.assertEqual(len(pack), 87)
        self.assertEqual(sum(1 for row in pack if row["requires_review"]), 6)
        self.assertEqual(len({row["wp_id"] for row in pack}), 87)
        self.assertEqual(len({row["youtube_id"] for row in pack}), 87)

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
