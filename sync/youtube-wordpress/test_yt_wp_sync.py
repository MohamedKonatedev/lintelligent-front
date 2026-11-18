#!/usr/bin/env python3
"""Contrôles locaux de la synchro. Aucun appel réseau, aucune écriture WordPress."""

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
import yt_wp_sync as sync  # noqa: E402


def sample_video(**overrides: object) -> sync.NormalizedVideo:
    data: dict[str, object] = {
        "video_id": "iAkpq0dqTNs",
        "title": "Journal du soir",
        "description": "Premier paragraphe.\n\n<script>alert(1)</script>",
        "published_at": datetime(2026, 11, 18, 11, 0, 7, tzinfo=timezone.utc),
        "thumbnail_urls": ("https://i.ytimg.com/vi/iAkpq0dqTNs/hqdefault.jpg",),
        "duration_display": "20:33",
        "privacy_status": "public",
        "upload_status": "processed",
        "live_broadcast_content": "none",
        "live_ended": True,
        "embeddable": True,
        "source": "api",
    }
    data.update(overrides)
    return sync.NormalizedVideo(**data)  # type: ignore[arg-type]


class MappingTests(unittest.TestCase):
    def test_extracts_ids_used_by_existing_posts(self) -> None:
        samples = {
            "https://www.youtube.com/watch?v=b2v1guPT74U": "b2v1guPT74U",
            "https://m.youtube.com/watch?v=KRc8-EnBzdk": "KRc8-EnBzdk",
            "https://youtu.be/_C2O8ABZr3c": "_C2O8ABZr3c",
            "https://www.youtube.com/embed/-R2gydGD-8M": "-R2gydGD-8M",
            "https://www.youtube.com/shorts/-WEShvzLMs0": "-WEShvzLMs0",
            "https://www.youtube.com/live/iAkpq0dqTNs": "iAkpq0dqTNs",
            "pas une url": None,
        }
        for raw, expected in samples.items():
            self.assertEqual(sync.extract_youtube_id(raw), expected)

    def test_duration_matches_editorial_display(self) -> None:
        self.assertEqual(sync.iso8601_duration_to_display("PT20M33S"), "20:33")
        self.assertEqual(sync.iso8601_duration_to_display("PT1H2M35S"), "01:02:35")
        self.assertEqual(sync.iso8601_duration_to_display("PT9M5S"), "9:05")
        self.assertEqual(sync.iso8601_duration_to_display("PT45S"), "0:45")
        self.assertIsNone(sync.iso8601_duration_to_display("PT0S"))
        self.assertIsNone(sync.iso8601_duration_to_display("P1DT1H"))

    def test_diffusion_date_uses_abidjan_and_can_cross_midnight(self) -> None:
        moment = datetime(2026, 11, 18, 23, 30, tzinfo=timezone.utc)
        self.assertEqual(sync.to_ymd(moment, ZoneInfo("Africa/Abidjan")), "20261118")
        self.assertEqual(sync.to_ymd(moment, ZoneInfo("Etc/GMT-1")), "20261119")

    def test_description_is_escaped_and_split(self) -> None:
        html = sync.description_to_html("Ligne A\nLigne B\n\n<script>x</script>")
        self.assertEqual(
            html,
            "<p>Ligne A<br />Ligne B</p>\n<p>&lt;script&gt;x&lt;/script&gt;</p>",
        )

    def test_post_body_uses_only_existing_acf_fields(self) -> None:
        body = sync.build_post_body(sample_video(), ZoneInfo("Africa/Abidjan"), featured_media=145)
        self.assertEqual(body["status"], "publish")
        self.assertEqual(body["date_gmt"], "2026-11-18T11:00:07")
        self.assertEqual(body["featured_media"], 145)
        acf = body["acf"]
        self.assertEqual(
            set(acf),
            {"lien_video", "duree", "date_diffusion"},
        )
        self.assertEqual(acf["lien_video"], "https://www.youtube.com/watch?v=iAkpq0dqTNs")
        self.assertEqual(acf["duree"], "20:33")
        self.assertEqual(acf["date_diffusion"], "20261118")
        self.assertNotIn("presentateur", acf)
        self.assertNotIn("categories", body)
        self.assertNotIn("<script>", body["content"])

    def test_schema_requires_the_live_acf_names(self) -> None:
        schema = {
            "properties": {
                "acf": {
                    "properties": {
                        "lien_video": {},
                        "duree": {},
                        "presentateur": {},
                        "date_diffusion": {},
                    }
                }
            }
        }
        ok, names = sync.verify_acf_schema(schema)
        self.assertTrue(ok)
        self.assertEqual(names, ["date_diffusion", "duree", "lien_video", "presentateur"])
        broken = {"properties": {"acf": {"properties": {"lien_video": {}}}}}
        ok_broken, _names = sync.verify_acf_schema(broken)
        self.assertFalse(ok_broken)


class DecisionTests(unittest.TestCase):
    def test_duplicate_history_live_and_private_never_create(self) -> None:
        open_watermark = datetime(2026, 11, 18, 10, 0, tzinfo=timezone.utc)
        closed_watermark = datetime(2026, 11, 18, 12, 0, tzinfo=timezone.utc)
        cases = [
            (sample_video(), {"iAkpq0dqTNs"}, None, "duplicate"),
            (sample_video(privacy_status="private"), set(), open_watermark, "privacy:private"),
            (sample_video(live_broadcast_content="live", live_ended=False), set(), open_watermark, "broadcast:live"),
            (sample_video(live_broadcast_content="upcoming", live_ended=False), set(), open_watermark, "broadcast:upcoming"),
            (sample_video(live_ended=False), set(), open_watermark, "live-not-ended"),
            (sample_video(embeddable=False), set(), open_watermark, "not-embeddable"),
            (sample_video(upload_status="uploaded"), set(), open_watermark, "upload:uploaded"),
            (sample_video(duration_display=None), set(), open_watermark, "duration-missing"),
            (sample_video(), set(), closed_watermark, "before-watermark"),
            (sample_video(), set(), None, "bootstrap-required"),
            (sample_video(source="atom"), set(), open_watermark, "unverified-no-api"),
        ]
        for video, existing, after, reason in cases:
            action = sync.plan_action(video, existing, after)
            self.assertEqual(action.decision, "skip", reason)
            self.assertEqual(action.reason, reason)

    def test_public_vod_after_watermark_is_created_once(self) -> None:
        video = sample_video(published_at=datetime(2026, 11, 18, 15, 0, tzinfo=timezone.utc))
        after = datetime(2026, 11, 18, 12, 0, tzinfo=timezone.utc)
        action = sync.plan_action(video, set(), after)
        self.assertEqual(action.decision, "create")
        self.assertEqual(action.reason, "eligible")

    def test_completed_live_can_become_a_replay(self) -> None:
        item = {
            "id": "iAkpq0dqTNs",
            "snippet": {
                "title": "Replay",
                "description": "Texte",
                "publishedAt": "2026-11-18T15:00:00Z",
                "liveBroadcastContent": "none",
                "thumbnails": {"high": {"url": "https://i.ytimg.com/vi/iAkpq0dqTNs/hqdefault.jpg"}},
            },
            "contentDetails": {"duration": "PT31M53S"},
            "status": {"privacyStatus": "public", "uploadStatus": "processed", "embeddable": True},
            "liveStreamingDetails": {
                "actualStartTime": "2026-11-18T14:00:00Z",
                "actualEndTime": "2026-11-18T14:31:00Z",
            },
        }
        video = sync.from_api_video(item)
        self.assertIsNotNone(video)
        assert video is not None
        self.assertEqual(video.duration_display, "31:53")
        self.assertIsNone(sync.classify(video))

    def test_search_endpoint_is_rejected(self) -> None:
        with self.assertRaises(sync.SyncError):
            sync.assert_quota_safe("https://www.googleapis.com/youtube/v3/search?part=snippet")

    def test_wrong_channel_handle_is_rejected(self) -> None:
        self.assertIsNone(sync.channel_handle_error({"customUrl": "@LintelligentTV"}, "LintelligentTV"))
        self.assertIsNotNone(sync.channel_handle_error({"customUrl": "@autre"}, "LintelligentTV"))


class SafetyTests(unittest.TestCase):
    def test_dry_run_blocks_writes(self) -> None:
        client = sync.HttpClient(allow_write=False)
        with self.assertRaises(sync.WriteBlocked):
            client.request("POST", "https://cms.lintelligent.tv/wp-json/wp/v2/videos", body=b"{}")
        with self.assertRaises(sync.WriteBlocked):
            client.request("DELETE", "https://cms.lintelligent.tv/wp-json/wp/v2/videos/1")

    def test_secrets_are_redacted(self) -> None:
        text = sync.redact(
            "key=AIzaSecret123&password=abcd efgh ijkl mnop",
            ["AIzaSecret123", "abcd efgh ijkl mnop"],
        )
        self.assertNotIn("AIzaSecret123", text)
        self.assertNotIn("abcd efgh", text)
        self.assertIn("key=***", sync.safe_url("https://www.googleapis.com/youtube/v3/videos?key=AIzaSecret123"))

    def test_apply_gates_and_bootstrap_do_not_touch_wordpress(self) -> None:
        self.assertGreaterEqual(len(sync.apply_gates({}, {})), 3)
        with tempfile.TemporaryDirectory() as tmp:
            code = sync.main(["--bootstrap", "--state-dir", tmp, "--import-after", "2026-11-18T12:00:00Z"])
            self.assertEqual(code, 0)
            state = json.loads((Path(tmp) / "state.json").read_text(encoding="utf-8"))
            self.assertEqual(state["import_after"], "2026-11-18T12:00:00Z")
            self.assertEqual(state["synced"], {})
            self.assertEqual(sync.main(["--bootstrap", "--state-dir", tmp]), sync.EXIT_CONFIG)

    def test_apply_without_enable_exits_before_any_write(self) -> None:
        keys = [
            "YOUTUBE_API_KEY",
            "WP_USER",
            "WP_APP_PASSWORD",
            "YT_SYNC_ENABLED",
            "YT_SYNC_STATE_DIR",
        ]
        saved = {key: os.environ.get(key) for key in keys}
        try:
            for key in keys:
                os.environ.pop(key, None)
            self.assertEqual(sync.main(["--apply"]), sync.EXIT_CONFIG)
        finally:
            for key, value in saved.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value

    def test_atom_feed_parses_public_entry(self) -> None:
        xml = """<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
          <title>L'intelligent TV</title>
          <entry>
            <yt:videoId>iAkpq0dqTNs</yt:videoId>
            <title>Sujet du jour</title>
            <published>2026-11-18T11:00:07+00:00</published>
            <media:group>
              <media:description>Résumé du sujet</media:description>
              <media:thumbnail url="https://i.ytimg.com/vi/iAkpq0dqTNs/hqdefault.jpg"/>
            </media:group>
          </entry>
        </feed>
        """.encode()
        title, videos = sync.parse_atom(xml)
        self.assertEqual(title, "L'intelligent TV")
        self.assertEqual(videos[0].video_id, "iAkpq0dqTNs")
        self.assertEqual(videos[0].source, "atom")
        self.assertEqual(sync.plan_action(videos[0], set(), None).reason, "unverified-no-api")


def catalog() -> list[sync.EmissionCategory]:
    rows = [
        (7, "les-entretiens", "Les Entretiens"),
        (6, "le-debat", "Le Débat"),
        (2, "a-vous-la-parole", "À vous la parole"),
        (3, "linvite", "L’invité"),
        (4, "la-quotidienne-du-sport", "La quotidienne du sport"),
        (5, "la-revue-de-presse-grand-format", "La revue de presse grand format"),
        (10, "lintelligent-club", "L'intelligent Club"),
    ]
    paired, extras, missing = sync.pair_emissions(
        [{"id": term_id, "slug": slug, "name": name} for term_id, slug, name in rows]
        + [{"id": 9, "slug": "actu-sport", "name": "Actu Sport"}, {"id": 1, "slug": "uncategorized", "name": "Uncategorized"}]
    )
    assert not missing
    assert [row["slug"] for row in extras] == ["actu-sport"]
    return paired


class EmissionTests(unittest.TestCase):
    def test_title_variants_use_live_term_ids(self) -> None:
        emissions = catalog()
        cases = {
            "À VOUS LA PAROLE AVEC FOOD'S CO": (2, "a-vous-la-parole"),
            "les  entretiens : special": (7, "les-entretiens"),
            "L’INVITÉ AVEC BLANCHE MORO": (3, "linvite"),
            "Le débat du 09 avril": (6, "le-debat"),
            "La Revue de Presse Grand Format — 2 septembre": (5, "la-revue-de-presse-grand-format"),
        }
        for title, expected in cases.items():
            match = sync.match_emission(title, emissions)
            self.assertEqual(match.status, "matched", title)
            assert match.emission is not None
            self.assertEqual((match.emission.term_id, match.emission.slug), expected)

    def test_unknown_and_ambiguous_titles_are_not_invented(self) -> None:
        emissions = catalog()
        unknown = sync.match_emission("LES COUPS DE LA VIE TOUR", emissions)
        self.assertEqual(unknown.status, "unclassified")
        self.assertIsNone(unknown.emission)
        mixed = sync.match_emission("Le débat reçoit Les entretiens", emissions)
        self.assertEqual(mixed.status, "ambiguous")
        self.assertIsNone(mixed.emission)
        self.assertCountEqual(mixed.candidate_slugs, ["le-debat", "les-entretiens"])

    def test_category_is_attached_only_on_a_clear_match(self) -> None:
        emissions = catalog()
        video = sample_video(title="À vous la parole")
        action = sync.with_category(
            sync.plan_action(video, set(), datetime(2026, 1, 1, tzinfo=timezone.utc)),
            sync.match_emission(video.title, emissions),
        )
        body = sync.build_post_body(video, ZoneInfo("Africa/Abidjan"), None, category_id=action.category_id)
        self.assertEqual(body["categories"], [2])
        plain = sync.build_post_body(video, ZoneInfo("Africa/Abidjan"), None)
        self.assertNotIn("categories", plain)

    def test_duplicate_is_not_updated(self) -> None:
        video = sample_video()
        action = sync.plan_action(video, {video.video_id}, None, respect_watermark=False)
        self.assertEqual(action.decision, "skip")
        self.assertEqual(action.reason, "duplicate")

    def test_history_window_includes_18_november(self) -> None:
        start, end = sync.history_window(ZoneInfo("Africa/Abidjan"), "2026-09-01", "2026-11-18")
        self.assertEqual(start, datetime(2026, 9, 1, tzinfo=timezone.utc))
        self.assertEqual(end, datetime(2026, 11, 19, tzinfo=timezone.utc))
        self.assertLess(datetime(2026, 11, 18, 23, 59, tzinfo=timezone.utc), end)
        self.assertLess(datetime(2026, 8, 31, 23, 59, tzinfo=timezone.utc), start)

    def test_history_keeps_timer_watermark(self) -> None:
        state = {"import_after": "2026-11-18T12:00:00Z", "bootstrapped_at": "2026-11-18T12:00:00Z", "synced": {}}
        sync.remember_created(state, "iAkpq0dqTNs", 99, True, "history")
        self.assertEqual(state["import_after"], "2026-11-18T12:00:00Z")
        self.assertEqual(state["bootstrapped_at"], "2026-11-18T12:00:00Z")
        self.assertEqual(state["synced"]["iAkpq0dqTNs"]["source"], "history")

    def test_history_pagination_fails_closed_when_truncated(self) -> None:
        pages = [
            {"items": [playlist_item("aaaaaaaaaaa", "2026-11-18T11:00:07Z")], "nextPageToken": "MORE"},
            {"items": [playlist_item("bbbbbbbbbbb", "2026-11-01T11:00:07Z")], "nextPageToken": "STILL"},
        ]

        class FakeHttp:
            def __init__(self) -> None:
                self.calls = 0

            def request(self, method: str, url: str, headers: dict | None = None, body: bytes | None = None) -> sync.HttpResult:
                page = pages[self.calls]
                self.calls += 1
                return sync.HttpResult(200, {}, json.dumps(page).encode())

        with self.assertRaises(sync.SyncError) as caught:
            list(
                sync.iter_playlist_video_refs(
                    FakeHttp(),  # type: ignore[arg-type]
                    "key",
                    "UU23",
                    None,
                    [0],
                    1,
                    not_before=datetime(2026, 9, 1, tzinfo=timezone.utc),
                    not_after=datetime(2026, 11, 19, tzinfo=timezone.utc),
                    strict=True,
                )
            )
        self.assertIn("incomplète", str(caught.exception))

    def test_history_walks_pages_until_the_start(self) -> None:
        pages = [
            {"items": [playlist_item("aaaaaaaaaaa", "2026-11-20T11:00:07Z")], "nextPageToken": "P2"},
            {
                "items": [
                    playlist_item("bbbbbbbbbbb", "2026-11-18T11:00:07Z"),
                    playlist_item("ccccccccccc", "2026-08-31T11:00:07Z"),
                ],
                "nextPageToken": "SHOULD-NOT-FETCH",
            },
        ]

        class FakeHttp:
            def __init__(self) -> None:
                self.calls = 0

            def request(self, method: str, url: str, headers: dict | None = None, body: bytes | None = None) -> sync.HttpResult:
                page = pages[self.calls]
                self.calls += 1
                return sync.HttpResult(200, {}, json.dumps(page).encode())

        http = FakeHttp()
        found = list(
            sync.iter_playlist_video_refs(
                http,  # type: ignore[arg-type]
                "key",
                "UU23",
                None,
                [0],
                40,
                not_before=datetime(2026, 9, 1, tzinfo=timezone.utc),
                not_after=datetime(2026, 11, 19, tzinfo=timezone.utc),
                strict=True,
            )
        )
        self.assertEqual([item[0] for item in found], ["bbbbbbbbbbb"])
        self.assertEqual(http.calls, 2)

    def test_history_without_api_key_does_not_publish(self) -> None:
        saved = os.environ.get("YOUTUBE_API_KEY")
        os.environ.pop("YOUTUBE_API_KEY", None)
        try:
            with tempfile.TemporaryDirectory() as tmp:
                code = sync.main(["--history", "--dry-run", "--state-dir", tmp, "--report", str(Path(tmp) / "report.json")])
                self.assertEqual(code, sync.EXIT_CONFIG)
                self.assertFalse((Path(tmp) / "report.json").exists())
                self.assertFalse((Path(tmp) / "state.json").exists())
        finally:
            if saved is not None:
                os.environ["YOUTUBE_API_KEY"] = saved


def playlist_item(video_id: str, published: str) -> dict[str, object]:
    return {
        "contentDetails": {"videoId": video_id, "videoPublishedAt": published},
        "snippet": {"title": "Titre", "publishedAt": published},
    }


if __name__ == "__main__":
    unittest.main()
