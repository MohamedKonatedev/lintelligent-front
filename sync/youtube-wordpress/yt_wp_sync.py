#!/usr/bin/env python3
"""Synchronise les nouvelles vidéos publiques YouTube vers le CPT WordPress `videos`.

Création seule : une vidéo déjà présente n'est jamais mise à jour.
Le mode par défaut est le dry-run (aucune écriture WordPress).

Secrets : variables d'environnement ou fichier --env-file hors du dépôt.
Ce script n'est pas exécuté par le conteneur Next.js.
"""

from __future__ import annotations

import argparse
import base64
import fcntl
import html
import json
import logging
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from contextlib import contextmanager
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterator
from zoneinfo import ZoneInfo

import editorial
import editorial_backfill

LOG = logging.getLogger("yt_wp_sync")

DEFAULT_CHANNEL_ID = "UC23vhsEy8dqmxPV1bC6r7uQ"
DEFAULT_HANDLE = "LintelligentTV"
DEFAULT_WP_BASE = "https://cms.lintelligent.tv"
DEFAULT_TIMEZONE = "Africa/Abidjan"
API_ROOT = "https://www.googleapis.com/youtube/v3"
USER_AGENT = "LintelligentTvYtSync/1.0 (+https://lintelligent.tv)"
ATOM = "http://www.w3.org/2005/Atom"
YT_NS = "http://www.youtube.com/xml/schemas/2015"
MEDIA_NS = "http://search.yahoo.com/mrss/"
YOUTUBE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
DURATION_RE = re.compile(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$")
WATCH_URL_RE = re.compile(
    r"(?:youtube\.com/(?:watch\?(?:[^#]*&)?v=|embed/|shorts/|live/)|youtu\.be/)([A-Za-z0-9_-]{11})"
)
ACF_REQUIRED = ("lien_video", "duree", "date_diffusion")
MAX_PLAYLIST_PAGES = 10
PLAYLIST_PAGE_SIZE = 50
VIDEOS_BATCH = 50
THUMB_MAX_BYTES = 5_000_000
HISTORY_FROM = "2026-09-01"
HISTORY_TO = "2026-11-18"
HISTORY_MAX_PAGES = 40
# Slugs des pages /programmes du frontend. Les IDs viennent de l'API WordPress.
EMISSION_PAGE_SLUGS = (
    "les-entretiens",
    "le-debat",
    "a-vous-la-parole",
    "linvite",
    "la-quotidienne-du-sport",
    "la-revue-de-presse-grand-format",
    "lintelligent-club",
)
PROGRAMME_TITLES = {
    "les-entretiens": "Les Entretiens",
    "le-debat": "Le Débat",
    "a-vous-la-parole": "À vous la parole",
    "linvite": "L'Invité",
    "la-quotidienne-du-sport": "La Quotidienne du Sport",
    "la-revue-de-presse-grand-format": "La Revue de Presse Grand Format",
    "lintelligent-club": "L'Intelligent Club",
}
EXIT_OK = 0
EXIT_ERROR = 1
EXIT_CONFIG = 2
EXIT_LOCKED = 3
EXIT_WP = 4
EXIT_QUOTA = 75


class WriteBlocked(RuntimeError):
    """Appel HTTP d'écriture alors que le mode ne l'autorise pas."""


class SyncError(RuntimeError):
    def __init__(self, message: str, exit_code: int = EXIT_ERROR) -> None:
        super().__init__(message)
        self.exit_code = exit_code


@dataclass
class HttpResult:
    status: int
    headers: dict[str, str]
    body: bytes

    def json(self) -> object:
        if not self.body:
            return None
        return json.loads(self.body.decode("utf-8"))

    def header(self, name: str) -> str | None:
        wanted = name.lower()
        for key, value in self.headers.items():
            if key.lower() == wanted:
                return value
        return None


class HttpClient:
    def __init__(self, allow_write: bool, timeout: float = 30.0, retries: int = 3) -> None:
        self.allow_write = allow_write
        self.timeout = timeout
        self.retries = retries

    def request(
        self,
        method: str,
        url: str,
        headers: dict[str, str] | None = None,
        body: bytes | None = None,
    ) -> HttpResult:
        if method.upper() not in {"GET", "HEAD", "OPTIONS"} and not self.allow_write:
            raise WriteBlocked(f"écriture bloquée ({method} {safe_url(url)})")
        merged = {"User-Agent": USER_AGENT}
        if headers:
            merged.update(headers)
        attempt = 0
        while True:
            attempt += 1
            req = urllib.request.Request(url, data=body, headers=merged, method=method.upper())
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as res:
                    return HttpResult(res.status, dict(res.headers), res.read())
            except urllib.error.HTTPError as exc:
                raw = exc.read()
                result = HttpResult(exc.code, dict(exc.headers or {}), raw)
                if method.upper() == "GET" and result.status in {429, 500, 502, 503, 504} and attempt < self.retries:
                    time.sleep(min(8, 2 ** (attempt - 1)))
                    continue
                return result
            except urllib.error.URLError as exc:
                if method.upper() == "GET" and attempt < self.retries:
                    time.sleep(min(8, 2 ** (attempt - 1)))
                    continue
                raise SyncError(f"réseau {method} {safe_url(url)} : {exc.reason}") from exc


@dataclass(frozen=True)
class NormalizedVideo:
    video_id: str
    title: str
    description: str
    published_at: datetime
    thumbnail_urls: tuple[str, ...]
    duration_display: str | None
    privacy_status: str | None
    upload_status: str | None
    live_broadcast_content: str | None
    live_ended: bool | None
    embeddable: bool | None
    source: str


@dataclass(frozen=True)
class EmissionCategory:
    term_id: int
    slug: str
    names: tuple[str, ...]


@dataclass(frozen=True)
class TitleMatch:
    status: str
    emission: EmissionCategory | None = None
    candidate_slugs: tuple[str, ...] = ()


@dataclass(frozen=True)
class Action:
    video: NormalizedVideo
    decision: str
    reason: str
    category_id: int | None = None
    category_slug: str | None = None
    category_name: str | None = None
    category_status: str = ""
    category_candidates: tuple[str, ...] = ()
    editorial_title: str | None = None
    editorial_summary: str | None = None
    editorial_method: str = ""
    editorial_review: bool = False
    editorial_note: str = ""

    def payload_preview(self, zone: ZoneInfo) -> dict[str, object] | None:
        if self.decision != "create" and self.reason not in {"bootstrap-required", "unverified-no-api"}:
            return None
        body = build_post_body(
            self.video,
            zone,
            featured_media=None,
            category_id=self.category_id,
            editorial_title=self.editorial_title,
            editorial_summary=self.editorial_summary,
        )
        content = body.get("content")
        if isinstance(content, str) and len(content) > 280:
            body["content"] = content[:280] + "…"
            body["content_truncated"] = True
        return body


@dataclass
class RunReport:
    mode: str
    writes: bool
    channel_id: str
    wp_base_url: str
    source: str
    api_key_present: bool
    bootstrap_present: bool
    import_after: str | None
    watermark_simulated: bool
    wp_video_count: int | None = None
    wp_youtube_ids: int | None = None
    acf_fields: list[str] = field(default_factory=list)
    acf_fields_ok: bool | None = None
    feed_channel_title: str | None = None
    quota_units_estimate: int = 0
    summary: dict[str, int] = field(default_factory=dict)
    decisions: list[dict[str, object]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    history: dict[str, object] | None = None

    def to_json(self) -> dict[str, object]:
        return {
            "mode": self.mode,
            "writes": self.writes,
            "channel_id": self.channel_id,
            "wp_base_url": self.wp_base_url,
            "source": self.source,
            "api_key_present": self.api_key_present,
            "bootstrap_present": self.bootstrap_present,
            "import_after": self.import_after,
            "watermark_simulated": self.watermark_simulated,
            "wp_video_count": self.wp_video_count,
            "wp_youtube_ids": self.wp_youtube_ids,
            "acf_fields": self.acf_fields,
            "acf_fields_ok": self.acf_fields_ok,
            "feed_channel_title": self.feed_channel_title,
            "quota_units_estimate": self.quota_units_estimate,
            "summary": self.summary,
            "notes": self.notes,
            "history": self.history,
            "decisions": self.decisions,
        }


def safe_url(url: str) -> str:
    return re.sub(r"([?&]key=)[^&]+", r"\1***", url)


def redact(text: str, secrets: list[str]) -> str:
    cleaned = safe_url(text)
    for secret in secrets:
        if secret and len(secret) >= 6:
            cleaned = cleaned.replace(secret, "***")
    return cleaned


def load_env_file(path: Path) -> None:
    if not path.is_file():
        raise SyncError(f"fichier d'environnement introuvable : {path}", EXIT_CONFIG)
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ[key.strip()] = value.strip().strip('"').strip("'")


def parse_rfc3339(value: str) -> datetime:
    dt = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def format_wp_gmt(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")


def to_ymd(dt: datetime, zone: ZoneInfo) -> str:
    return dt.astimezone(zone).strftime("%Y%m%d")


def extract_youtube_id(value: str | None) -> str | None:
    if not value:
        return None
    text = value.strip()
    if YOUTUBE_ID_RE.fullmatch(text):
        return text
    match = WATCH_URL_RE.search(text)
    if match:
        return match.group(1)
    return None


def canonical_watch_url(video_id: str) -> str:
    if not YOUTUBE_ID_RE.fullmatch(video_id):
        raise SyncError(f"identifiant YouTube invalide : {video_id}")
    return f"https://www.youtube.com/watch?v={video_id}"


def iso8601_duration_to_display(raw: str | None) -> str | None:
    if not raw:
        return None
    match = DURATION_RE.fullmatch(raw.strip())
    if not match:
        return None
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    total = hours * 3600 + minutes * 60 + seconds
    if total <= 0:
        return None
    hours, rem = divmod(total, 3600)
    minutes, seconds = divmod(rem, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


def normalize_label(value: str) -> str:
    text = unicodedata.normalize("NFKD", value)
    text = "".join(char for char in text if not unicodedata.combining(char))
    for apostrophe in ("'", "’", "‘", "`", "´", "ʼ"):
        text = text.replace(apostrophe, "'")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def match_emission(title: str, emissions: list[EmissionCategory]) -> TitleMatch:
    padded = f" {normalize_label(title)} "
    hits: list[EmissionCategory] = []
    for emission in emissions:
        labels = [normalize_label(name) for name in emission.names]
        labels = [label for label in dict.fromkeys(labels) if label]
        if any(f" {label} " in padded for label in labels):
            hits.append(emission)
    if not hits:
        return TitleMatch("unclassified")
    if len(hits) == 1:
        return TitleMatch("matched", hits[0], (hits[0].slug,))

    def longest(emission: EmissionCategory) -> int:
        return max(len(normalize_label(name)) for name in emission.names)

    ordered = sorted(hits, key=longest, reverse=True)
    top_labels = [normalize_label(name) for name in ordered[0].names]
    others_inside_top = all(
        any(other and any(other in label for label in top_labels) for other in (normalize_label(name) for name in emission.names))
        for emission in ordered[1:]
    )
    if others_inside_top and longest(ordered[0]) > longest(ordered[1]):
        return TitleMatch("matched", ordered[0], tuple(emission.slug for emission in ordered))
    return TitleMatch("ambiguous", None, tuple(emission.slug for emission in ordered))


def pair_emissions(categories: list[dict]) -> tuple[list[EmissionCategory], list[dict], list[str]]:
    by_slug = {str(row.get("slug") or ""): row for row in categories if isinstance(row, dict)}
    paired: list[EmissionCategory] = []
    missing: list[str] = []
    for slug in EMISSION_PAGE_SLUGS:
        row = by_slug.get(slug)
        term_id = row.get("id") if isinstance(row, dict) else None
        name = str(row.get("name") or "").strip() if isinstance(row, dict) else ""
        if not isinstance(term_id, int) or term_id < 1 or not name:
            missing.append(slug)
            continue
        names = [name]
        programme = PROGRAMME_TITLES.get(slug, "")
        if programme and normalize_label(programme) not in {normalize_label(item) for item in names}:
            names.append(programme)
        if slug == "linvite":
            names.append("L'invitée")
        paired.append(EmissionCategory(term_id=term_id, slug=slug, names=tuple(names)))
    extras = [
        row
        for row in categories
        if isinstance(row, dict)
        and str(row.get("slug") or "") not in EMISSION_PAGE_SLUGS
        and str(row.get("slug") or "") != "uncategorized"
    ]
    return paired, extras, missing


def with_category(action: Action, match: TitleMatch) -> Action:
    emission = match.emission if match.status == "matched" else None
    return replace(
        action,
        category_id=emission.term_id if emission else None,
        category_slug=emission.slug if emission else None,
        category_name=emission.names[0] if emission else None,
        category_status=match.status,
        category_candidates=match.candidate_slugs,
    )


def history_window(zone: ZoneInfo, start_day: str, end_day: str) -> tuple[datetime, datetime]:
    start = datetime.fromisoformat(start_day).replace(tzinfo=zone).astimezone(timezone.utc)
    end_day_value = datetime.fromisoformat(end_day).replace(tzinfo=zone)
    end_exclusive = (end_day_value + timedelta(days=1)).astimezone(timezone.utc)
    if end_exclusive <= start:
        raise SyncError("la fin de la période précède son début", EXIT_CONFIG)
    return start, end_exclusive


def remember_created(
    state: dict,
    video_id: str,
    wp_id: int,
    linked: bool,
    source: str,
    copy: editorial.EditorialCopy | None = None,
    youtube_title: str = "",
    youtube_description: str = "",
) -> None:
    """Ajoute un identifiant créé sans toucher au repère du timer."""
    import_after = state.get("import_after")
    bootstrapped_at = state.get("bootstrapped_at")
    synced = state.setdefault("synced", {})
    if not isinstance(synced, dict):
        raise SyncError("fichier d'état illisible", EXIT_CONFIG)
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    record: dict[str, object] = {
        "wp_id": wp_id,
        "created_at": created_at,
        "lien_video_ok": linked,
        "source": source,
    }
    if copy is not None:
        record.update(
            {
                "youtube_title": youtube_title,
                "youtube_description": youtube_description[:8000],
                "editorial_title": copy.title,
                "editorial_summary": copy.summary,
                "editorial_method": copy.method,
                "editorial_needs_review": copy.needs_review,
                "editorial_applied_at": created_at,
            }
        )
    synced[video_id] = record
    if state.get("import_after") != import_after or state.get("bootstrapped_at") != bootstrapped_at:
        raise SyncError("le repère automatique a été modifié", EXIT_ERROR)


def summarize_history(actions: list[Action]) -> dict[str, object]:
    by_emission: dict[str, dict[str, object]] = {}
    unclassified: list[dict[str, str]] = []
    ambiguous: list[dict[str, object]] = []
    excluded: dict[str, int] = {}
    for action in actions:
        if action.reason == "duplicate":
            bucket_key = "already_present"
        elif action.decision == "create":
            bucket_key = "to_import"
        else:
            excluded[action.reason] = excluded.get(action.reason, 0) + 1
            continue
        if action.category_status == "matched" and action.category_slug:
            bucket = by_emission.setdefault(
                action.category_slug,
                {
                    "slug": action.category_slug,
                    "name": action.category_name,
                    "id": action.category_id,
                    "to_import": 0,
                    "already_present": 0,
                },
            )
            bucket[bucket_key] = int(bucket[bucket_key]) + 1
        elif action.category_status == "unclassified":
            unclassified.append(
                {
                    "video_id": action.video.video_id,
                    "title": action.video.title,
                    "action": bucket_key,
                }
            )
        elif action.category_status == "ambiguous":
            ambiguous.append(
                {
                    "video_id": action.video.video_id,
                    "title": action.video.title,
                    "candidates": list(action.category_candidates),
                    "action": bucket_key,
                }
            )
    return {
        "youtube_in_window": len(actions),
        "already_in_wordpress": sum(1 for action in actions if action.reason == "duplicate"),
        "to_import": sum(1 for action in actions if action.decision == "create"),
        "excluded": excluded,
        "by_emission": list(by_emission.values()),
        "unclassified": unclassified,
        "ambiguous": ambiguous,
        "import_after_unchanged": True,
    }


def description_to_html(description: str) -> str:
    text = description.replace("\r\n", "\n").replace("\r", "\n").strip()
    if len(text) > 10000:
        text = text[:10000].rstrip()
    if not text:
        return ""
    parts: list[str] = []
    for paragraph in re.split(r"\n{2,}", text):
        lines = [html.escape(line.strip()) for line in paragraph.split("\n")]
        lines = [line for line in lines if line]
        if lines:
            parts.append("<p>" + "<br />".join(lines) + "</p>")
    return "\n".join(parts)


def thumbnail_fallbacks(video_id: str) -> tuple[str, ...]:
    base = f"https://i.ytimg.com/vi/{video_id}"
    return (
        f"{base}/maxresdefault.jpg",
        f"{base}/sddefault.jpg",
        f"{base}/hqdefault.jpg",
    )


def build_post_body(
    video: NormalizedVideo,
    zone: ZoneInfo,
    featured_media: int | None,
    category_id: int | None = None,
    editorial_title: str | None = None,
    editorial_summary: str | None = None,
) -> dict[str, object]:
    acf: dict[str, str] = {
        "lien_video": canonical_watch_url(video.video_id),
        "date_diffusion": to_ymd(video.published_at, zone),
    }
    if video.duration_display:
        acf["duree"] = video.duration_display
    body: dict[str, object] = {
        "title": (editorial_title or video.title).strip(),
        "status": "publish",
        "date_gmt": format_wp_gmt(video.published_at),
        "acf": acf,
    }
    if editorial_summary is not None:
        content = editorial.editorial_paragraph(editorial_summary)
    else:
        content = description_to_html(video.description)
    if content:
        body["content"] = content
    if featured_media is not None:
        body["featured_media"] = featured_media
    if category_id is not None:
        if category_id < 1:
            raise SyncError("identifiant de catégorie invalide", EXIT_CONFIG)
        body["categories"] = [category_id]
    return body


def classify(video: NormalizedVideo) -> str | None:
    """Retourne un motif de rejet, ou None si la vidéo peut être créée."""
    if video.source != "api":
        return "unverified-no-api"
    if video.privacy_status != "public":
        return "privacy:" + (video.privacy_status or "unknown")
    if video.upload_status != "processed":
        return "upload:" + (video.upload_status or "unknown")
    if video.live_broadcast_content in {"live", "upcoming"}:
        return "broadcast:" + (video.live_broadcast_content or "unknown")
    if video.live_ended is False:
        return "live-not-ended"
    if video.embeddable is False:
        return "not-embeddable"
    if not video.duration_display:
        return "duration-missing"
    if not video.title.strip():
        return "title-missing"
    return None


def plan_action(
    video: NormalizedVideo,
    existing_ids: set[str],
    import_after: datetime | None,
    *,
    respect_watermark: bool = True,
) -> Action:
    if video.video_id in existing_ids:
        return Action(video, "skip", "duplicate")
    if respect_watermark and import_after is not None and video.published_at <= import_after:
        return Action(video, "skip", "before-watermark")
    reason = classify(video)
    if reason:
        return Action(video, "skip", reason)
    if respect_watermark and import_after is None:
        return Action(video, "skip", "bootstrap-required")
    return Action(video, "create", "eligible")


def summarize(actions: list[Action]) -> dict[str, int]:
    summary = {
        "seen": len(actions),
        "would_create": 0,
        "duplicate": 0,
        "before_watermark": 0,
        "bootstrap_required": 0,
        "unverified": 0,
        "skipped_other": 0,
    }
    for action in actions:
        if action.decision == "create":
            summary["would_create"] += 1
        elif action.reason == "duplicate":
            summary["duplicate"] += 1
        elif action.reason == "before-watermark":
            summary["before_watermark"] += 1
        elif action.reason == "bootstrap-required":
            summary["bootstrap_required"] += 1
        elif action.reason == "unverified-no-api":
            summary["unverified"] += 1
        else:
            summary["skipped_other"] += 1
    return summary


def verify_acf_schema(schema: dict) -> tuple[bool, list[str]]:
    props = ((schema.get("properties") or {}).get("acf") or {}).get("properties") or {}
    names = sorted(props.keys())
    missing = [name for name in ACF_REQUIRED if name not in props]
    return (not missing), names


def channel_handle_error(snippet: dict, expected_handle: str) -> str | None:
    custom = str(snippet.get("customUrl") or "").lstrip("@").lower()
    if custom and custom != expected_handle.lower():
        return f"la chaîne API @{custom} ne correspond pas à @{expected_handle}"
    return None


def youtube_error_reason(payload: object) -> str | None:
    if not isinstance(payload, dict):
        return None
    err = payload.get("error")
    if not isinstance(err, dict):
        return None
    errors = err.get("errors") or []
    if errors and isinstance(errors[0], dict):
        reason = errors[0].get("reason")
        return str(reason) if reason else None
    return None


def parse_atom(xml_bytes: bytes) -> tuple[str | None, list[NormalizedVideo]]:
    root = ET.fromstring(xml_bytes)
    channel_title = (root.findtext(f"{{{ATOM}}}title") or "").strip() or None
    videos: list[NormalizedVideo] = []
    for entry in root.findall(f"{{{ATOM}}}entry"):
        video_id = (entry.findtext(f"{{{YT_NS}}}videoId") or "").strip()
        title = (entry.findtext(f"{{{ATOM}}}title") or "").strip()
        published_raw = (entry.findtext(f"{{{ATOM}}}published") or "").strip()
        if not YOUTUBE_ID_RE.fullmatch(video_id) or not published_raw:
            continue
        description = entry.findtext(f"{{{MEDIA_NS}}}group/{{{MEDIA_NS}}}description") or ""
        thumb = entry.find(f"{{{MEDIA_NS}}}group/{{{MEDIA_NS}}}thumbnail")
        urls: list[str] = []
        if thumb is not None and thumb.get("url"):
            urls.append(thumb.get("url", ""))
        urls.extend(thumbnail_fallbacks(video_id))
        videos.append(
            NormalizedVideo(
                video_id=video_id,
                title=title,
                description=description.strip(),
                published_at=parse_rfc3339(published_raw),
                thumbnail_urls=tuple(dict.fromkeys(urls)),
                duration_display=None,
                privacy_status=None,
                upload_status=None,
                live_broadcast_content=None,
                live_ended=None,
                embeddable=None,
                source="atom",
            )
        )
    return channel_title, videos


def from_api_video(item: dict) -> NormalizedVideo | None:
    raw_id = item.get("id")
    video_id = raw_id if isinstance(raw_id, str) else ""
    if not YOUTUBE_ID_RE.fullmatch(video_id):
        return None
    snippet = item.get("snippet") or {}
    status = item.get("status") or {}
    details = item.get("contentDetails") or {}
    live = item.get("liveStreamingDetails") or {}
    broadcast = snippet.get("liveBroadcastContent") or "none"
    if not live:
        live_ended: bool | None = True if broadcast == "none" else False
    elif live.get("actualEndTime"):
        live_ended = True
    elif live.get("actualStartTime") or live.get("scheduledStartTime"):
        live_ended = False
    else:
        live_ended = True
    published_raw = snippet.get("publishedAt")
    if not published_raw:
        return None
    thumbs: list[str] = []
    for key in ("maxres", "standard", "high", "medium"):
        url = ((snippet.get("thumbnails") or {}).get(key) or {}).get("url")
        if url:
            thumbs.append(url)
    thumbs.extend(thumbnail_fallbacks(video_id))
    embeddable = status.get("embeddable")
    return NormalizedVideo(
        video_id=video_id,
        title=str(snippet.get("title") or "").strip(),
        description=str(snippet.get("description") or ""),
        published_at=parse_rfc3339(str(published_raw)),
        thumbnail_urls=tuple(dict.fromkeys(thumbs)),
        duration_display=iso8601_duration_to_display(details.get("duration")),
        privacy_status=status.get("privacyStatus"),
        upload_status=status.get("uploadStatus"),
        live_broadcast_content=broadcast,
        live_ended=live_ended,
        embeddable=embeddable if isinstance(embeddable, bool) else None,
        source="api",
    )


def basic_auth_header(user: str, password: str) -> dict[str, str]:
    token = base64.b64encode(f"{user}:{password}".encode("utf-8")).decode("ascii")
    return {"Authorization": f"Basic {token}"}


def wp_api_base(origin: str) -> str:
    return origin.rstrip("/") + "/wp-json/wp/v2"


def fetch_wp_schema(http: HttpClient, origin: str) -> dict:
    result = http.request("GET", wp_api_base(origin) + "/videos?per_page=1&context=view")
    # Le schéma complet est exposé par OPTIONS /videos.
    options = http.request("OPTIONS", wp_api_base(origin) + "/videos")
    if options.status != 200:
        raise SyncError(
            f"schéma WordPress indisponible (HTTP {options.status})",
            EXIT_WP,
        )
    payload = options.json()
    if not isinstance(payload, dict) or "schema" not in payload:
        raise SyncError("schéma WordPress inattendu", EXIT_WP)
    # L'appel GET ci-dessus vérifie que le CPT répond avant de lire le schéma.
    if result.status != 200:
        raise SyncError(f"liste videos indisponible (HTTP {result.status})", EXIT_WP)
    return payload["schema"]


def fetch_existing_youtube_ids(
    http: HttpClient,
    origin: str,
    auth: dict[str, str] | None,
) -> tuple[int, set[str]]:
    ids: set[str] = set()
    total = 0
    page = 1
    total_pages = 1
    status_query = "&status=any" if auth else ""
    while page <= total_pages:
        url = (
            f"{wp_api_base(origin)}/videos?per_page=100&page={page}"
            f"&_fields=id,acf,status{status_query}"
        )
        result = http.request("GET", url, headers=auth)
        if auth and page == 1 and result.status == 400 and status_query:
            status_query = ""
            continue
        if result.status != 200:
            raise SyncError(
                f"lecture des vidéos WordPress impossible (HTTP {result.status})",
                EXIT_WP,
            )
        if page == 1:
            total = int(result.header("X-WP-Total") or "0")
            total_pages = max(1, int(result.header("X-WP-TotalPages") or "1"))
        payload = result.json()
        if not isinstance(payload, list):
            raise SyncError("réponse WordPress inattendue", EXIT_WP)
        for post in payload:
            if not isinstance(post, dict):
                continue
            acf = post.get("acf") or {}
            if isinstance(acf, dict):
                found = extract_youtube_id(str(acf.get("lien_video") or ""))
                if found:
                    ids.add(found)
        page += 1
        if page > 100:
            raise SyncError("pagination WordPress trop longue", EXIT_WP)
    return total, ids


def fetch_wp_categories(http: HttpClient, origin: str) -> list[dict]:
    rows: list[dict] = []
    page = 1
    total_pages = 1
    while page <= total_pages:
        result = http.request(
            "GET",
            f"{wp_api_base(origin)}/categories?per_page=100&page={page}&_fields=id,name,slug,count",
        )
        if result.status != 200:
            raise SyncError(f"catégories WordPress indisponibles (HTTP {result.status})", EXIT_WP)
        payload = result.json()
        if not isinstance(payload, list):
            raise SyncError("réponse des catégories inattendue", EXIT_WP)
        rows.extend(row for row in payload if isinstance(row, dict))
        if page == 1:
            total_pages = max(1, int(result.header("X-WP-TotalPages") or "1"))
        page += 1
        if page > 20:
            raise SyncError("pagination des catégories trop longue", EXIT_WP)
    return rows


def fetch_emission_catalog(
    http: HttpClient, origin: str
) -> tuple[list[EmissionCategory], list[dict], list[str]]:
    return pair_emissions(fetch_wp_categories(http, origin))


def annotate_categories(actions: list[Action], emissions: list[EmissionCategory]) -> list[Action]:
    return [with_category(action, match_emission(action.video.title, emissions)) for action in actions]


def editorial_source(action: Action, zone: ZoneInfo) -> editorial.EditorialSource:
    show_name = action.category_name if action.category_status == "matched" else None
    return editorial.EditorialSource(
        youtube_title=action.video.title,
        youtube_description=action.video.description,
        show_name=show_name,
        published_at=action.video.published_at,
        zone=zone,
    )


def with_editorial(action: Action, zone: ZoneInfo, ai: editorial.AiSettings | None) -> Action:
    if action.decision != "create":
        return action
    copy = editorial.compose_editorial(editorial_source(action, zone), ai)
    return replace(
        action,
        editorial_title=copy.title,
        editorial_summary=copy.summary,
        editorial_method=copy.method,
        editorial_review=copy.needs_review,
        editorial_note=copy.note,
    )


def copy_from_action(action: Action) -> editorial.EditorialCopy | None:
    if not action.editorial_title or not action.editorial_summary:
        return None
    return editorial.EditorialCopy(
        title=action.editorial_title,
        summary=action.editorial_summary,
        method=action.editorial_method or "fallback",
        needs_review=action.editorial_review,
        note=action.editorial_note,
    )


def assert_quota_safe(url: str) -> None:
    if "/youtube/v3/search" in url:
        raise SyncError("search.list est interdit (quota)")


def api_get(http: HttpClient, url: str, units: list[int]) -> dict:
    assert_quota_safe(url)
    units[0] += 1
    result = http.request("GET", url)
    try:
        payload = result.json()
    except json.JSONDecodeError as exc:
        raise SyncError(f"réponse YouTube illisible ({result.status})") from exc
    if result.status == 200 and isinstance(payload, dict):
        return payload
    reason = youtube_error_reason(payload)
    if reason in {"quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"} or result.status == 429:
        raise SyncError(f"quota YouTube : {reason or result.status}", EXIT_QUOTA)
    if reason in {"keyInvalid", "badRequest"} or result.status in {400, 401, 403}:
        raise SyncError(f"API YouTube refusée : {reason or result.status}", EXIT_CONFIG)
    raise SyncError(f"API YouTube HTTP {result.status} ({reason or 'inconnu'})")


def fetch_uploads_playlist(http: HttpClient, api_key: str, channel_id: str, units: list[int]) -> tuple[str, dict]:
    url = (
        f"{API_ROOT}/channels?part=snippet,contentDetails&id={channel_id}&key={api_key}"
    )
    payload = api_get(http, url, units)
    items = payload.get("items") or []
    if not items:
        raise SyncError(f"chaîne introuvable : {channel_id}", EXIT_CONFIG)
    item = items[0]
    if item.get("id") != channel_id:
        raise SyncError("l'identifiant de chaîne renvoyé ne correspond pas", EXIT_CONFIG)
    handle_error = channel_handle_error(item.get("snippet") or {}, DEFAULT_HANDLE)
    if handle_error:
        raise SyncError(handle_error, EXIT_CONFIG)
    uploads = (
        ((item.get("contentDetails") or {}).get("relatedPlaylists") or {}).get("uploads")
    )
    if not uploads:
        raise SyncError("playlist des mises en ligne introuvable", EXIT_CONFIG)
    return str(uploads), item.get("snippet") or {}


def iter_playlist_video_refs(
    http: HttpClient,
    api_key: str,
    playlist_id: str,
    import_after: datetime | None,
    units: list[int],
    max_pages: int,
    *,
    not_before: datetime | None = None,
    not_after: datetime | None = None,
    strict: bool = False,
) -> Iterator[tuple[str, datetime, str]]:
    """Parcourt la playlist des mises en ligne, de la plus récente vers la plus ancienne.

    Le timer s'arrête au repère import_after. L'import historique lit toutes les
    pages jusqu'au début de la période et échoue s'il est tronqué.
    """
    page_token = ""
    limit = max(1, max_pages if strict else min(max_pages, MAX_PLAYLIST_PAGES))
    reached_older = False
    for page_index in range(limit):
        url = (
            f"{API_ROOT}/playlistItems?part=contentDetails,snippet&playlistId={playlist_id}"
            f"&maxResults={PLAYLIST_PAGE_SIZE}&key={api_key}"
        )
        if page_token:
            url += "&pageToken=" + page_token
        payload = api_get(http, url, units)
        for item in payload.get("items") or []:
            details = item.get("contentDetails") or {}
            snippet = item.get("snippet") or {}
            video_id = str(details.get("videoId") or "")
            published_raw = details.get("videoPublishedAt") or snippet.get("publishedAt")
            if not YOUTUBE_ID_RE.fullmatch(video_id) or not published_raw:
                continue
            published = parse_rfc3339(str(published_raw))
            if import_after is not None and published <= import_after:
                reached_older = True
                continue
            if not_after is not None and published >= not_after:
                continue
            if not_before is not None and published < not_before:
                reached_older = True
                continue
            yield video_id, published, str(snippet.get("title") or "")
        page_token = str(payload.get("nextPageToken") or "")
        if reached_older or not page_token:
            return
        if page_index == limit - 1 and page_token and not strict:
            LOG.warning(
                "file YouTube tronquée après %s pages ; le prochain passage reprendra le reliquat",
                limit,
            )
    if strict and page_token and not reached_older:
        raise SyncError(
            "playlist incomplète avant le début de la période ; aucune vidéo n'est créée",
            EXIT_ERROR,
        )


def fetch_video_details(
    http: HttpClient,
    api_key: str,
    video_ids: list[str],
    units: list[int],
) -> list[NormalizedVideo]:
    videos: list[NormalizedVideo] = []
    for offset in range(0, len(video_ids), VIDEOS_BATCH):
        batch = video_ids[offset : offset + VIDEOS_BATCH]
        url = (
            f"{API_ROOT}/videos?part=snippet,contentDetails,status,liveStreamingDetails"
            f"&id={','.join(batch)}&key={api_key}&maxResults=50"
        )
        payload = api_get(http, url, units)
        for item in payload.get("items") or []:
            if isinstance(item, dict):
                normalized = from_api_video(item)
                if normalized:
                    videos.append(normalized)
    return videos


def fetch_atom(http: HttpClient, channel_id: str) -> tuple[str | None, list[NormalizedVideo]]:
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    result = http.request("GET", url)
    if result.status != 200:
        raise SyncError(f"flux YouTube indisponible (HTTP {result.status})")
    return parse_atom(result.body)


def probe_thumbnail(http: HttpClient, urls: tuple[str, ...]) -> dict[str, object]:
    for url in urls:
        result = http.request("GET", url)
        content_type = (result.header("Content-Type") or "").split(";")[0].strip().lower()
        ok = (
            result.status == 200
            and content_type in {"image/jpeg", "image/jpg"}
            and 2000 <= len(result.body) <= THUMB_MAX_BYTES
            and result.body.startswith(b"\xff\xd8\xff")
        )
        if ok:
            return {"url": url, "bytes": len(result.body), "ok": True}
    return {"url": urls[0] if urls else None, "bytes": 0, "ok": False}


def load_state(path: Path) -> dict:
    if not path.is_file():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise SyncError(f"état illisible : {path}", EXIT_CONFIG)
    return payload


def save_state(path: Path, state: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    data = json.dumps(state, ensure_ascii=False, indent=2) + "\n"
    with tmp.open("w", encoding="utf-8") as handle:
        handle.write(data)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp, path)


@contextmanager
def exclusive_lock(path: Path) -> Iterator[None]:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = path.open("a+")
    try:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as exc:
        handle.close()
        raise SyncError("une synchronisation est déjà en cours", EXIT_LOCKED) from exc
    try:
        yield
    finally:
        fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        handle.close()


def state_paths(state_dir: Path) -> tuple[Path, Path]:
    return state_dir / "state.json", state_dir / "sync.lock"


def import_after_from_state(state: dict) -> datetime | None:
    raw = state.get("import_after")
    if not raw:
        return None
    return parse_rfc3339(str(raw))


def known_ids_from_state(state: dict) -> set[str]:
    synced = state.get("synced") or {}
    if not isinstance(synced, dict):
        return set()
    return {key for key in synced.keys() if YOUTUBE_ID_RE.fullmatch(key)}


def apply_gates(env: dict[str, str], state: dict) -> list[str]:
    errors: list[str] = []
    if env.get("YT_SYNC_ENABLED") != "1":
        errors.append("YT_SYNC_ENABLED doit valoir 1")
    if not env.get("YOUTUBE_API_KEY"):
        errors.append("YOUTUBE_API_KEY manquante")
    if not env.get("WP_USER") or not env.get("WP_APP_PASSWORD"):
        errors.append("WP_USER et WP_APP_PASSWORD sont requis")
    if not state.get("bootstrapped_at") or not state.get("import_after"):
        errors.append("bootstrap absent : aucun historique ne peut être importé")
    return errors


def upload_thumbnail(
    http: HttpClient,
    origin: str,
    auth: dict[str, str],
    video: NormalizedVideo,
    image: bytes,
) -> int:
    filename = f"yt-{video.video_id}.jpg"
    headers = {
        **auth,
        "Content-Type": "image/jpeg",
        "Content-Disposition": f'attachment; filename="{filename}"',
    }
    result = http.request("POST", wp_api_base(origin) + "/media", headers=headers, body=image)
    if result.status not in {200, 201}:
        raise SyncError(f"téléversement miniature HTTP {result.status}", EXIT_WP)
    payload = result.json()
    if not isinstance(payload, dict) or not isinstance(payload.get("id"), int):
        raise SyncError("réponse média WordPress inattendue", EXIT_WP)
    media_id = payload["id"]
    alt_headers = {**auth, "Content-Type": "application/json"}
    alt_body = json.dumps({"alt_text": video.title[:180], "title": video.title[:180]}).encode("utf-8")
    alt = http.request(
        "POST",
        f"{wp_api_base(origin)}/media/{media_id}",
        headers=alt_headers,
        body=alt_body,
    )
    if alt.status not in {200, 201}:
        LOG.warning("texte alternatif non enregistré pour le média %s", media_id)
    return media_id


def delete_media(http: HttpClient, origin: str, auth: dict[str, str], media_id: int) -> None:
    result = http.request(
        "DELETE",
        f"{wp_api_base(origin)}/media/{int(media_id)}?force=true",
        headers=auth,
    )
    if result.status not in {200, 201}:
        LOG.error("média orphelin %s non supprimé (HTTP %s)", media_id, result.status)


def create_video_post(
    http: HttpClient,
    origin: str,
    auth: dict[str, str],
    body: dict[str, object],
) -> dict:
    headers = {**auth, "Content-Type": "application/json"}
    result = http.request(
        "POST",
        wp_api_base(origin) + "/videos",
        headers=headers,
        body=json.dumps(body).encode("utf-8"),
    )
    if result.status not in {200, 201}:
        message = ""
        try:
            payload = result.json()
            if isinstance(payload, dict):
                message = str(payload.get("message") or payload.get("code") or "")
        except json.JSONDecodeError:
            message = result.body[:200].decode("utf-8", "replace")
        raise SyncError(f"création vidéo HTTP {result.status} {message}".strip(), EXIT_WP)
    payload = result.json()
    if not isinstance(payload, dict) or not isinstance(payload.get("id"), int):
        raise SyncError("réponse de création WordPress inattendue", EXIT_WP)
    return payload


def download_jpeg(http: HttpClient, urls: tuple[str, ...]) -> tuple[str, bytes]:
    for url in urls:
        result = http.request("GET", url)
        content_type = (result.header("Content-Type") or "").split(";")[0].strip().lower()
        if (
            result.status == 200
            and content_type in {"image/jpeg", "image/jpg"}
            and result.body.startswith(b"\xff\xd8\xff")
            and 2000 <= len(result.body) <= THUMB_MAX_BYTES
        ):
            return url, result.body
    raise SyncError("miniature JPEG introuvable")


def confirm_link(http: HttpClient, origin: str, auth: dict[str, str], wp_id: int, video_id: str, created: dict) -> bool:
    acf = created.get("acf") if isinstance(created.get("acf"), dict) else {}
    if extract_youtube_id(str((acf or {}).get("lien_video") or "")) == video_id:
        return True
    result = http.request(
        "GET",
        f"{wp_api_base(origin)}/videos/{wp_id}?_fields=id,acf",
        headers=auth,
    )
    if result.status != 200:
        return False
    payload = result.json()
    if not isinstance(payload, dict):
        return False
    acf = payload.get("acf") if isinstance(payload.get("acf"), dict) else {}
    return extract_youtube_id(str((acf or {}).get("lien_video") or "")) == video_id


def auth_check(http: HttpClient, origin: str, auth: dict[str, str]) -> dict[str, object]:
    result = http.request("GET", wp_api_base(origin).replace("/wp/v2", "") + "/wp/v2/users/me?context=edit", headers=auth)
    if result.status == 401:
        raise SyncError("mot de passe d'application refusé", EXIT_CONFIG)
    if result.status != 200:
        raise SyncError(f"auth-check HTTP {result.status}", EXIT_WP)
    payload = result.json()
    if not isinstance(payload, dict):
        raise SyncError("réponse users/me inattendue", EXIT_WP)
    caps = payload.get("capabilities") or {}
    enabled = sorted(name for name, value in caps.items() if value) if isinstance(caps, dict) else []
    broad = [name for name in enabled if name.startswith("edit_others") or name in {"manage_options", "delete_others_posts", "delete_others_videos"}]
    return {
        "id": payload.get("id"),
        "name": payload.get("name"),
        "roles": payload.get("roles"),
        "capability_count": len(enabled),
        "video_or_publish_caps": [name for name in enabled if "video" in name or name in {"upload_files", "publish_posts", "edit_posts", "edit_published_posts"}],
        "broader_than_expected": broad,
    }


def configure_logging(verbose: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        stream=sys.stderr,
        format="%(asctime)s %(levelname)s %(message)s",
    )


def env_settings() -> dict[str, str]:
    keys = [
        "YOUTUBE_API_KEY",
        "YOUTUBE_CHANNEL_ID",
        "WP_BASE_URL",
        "WP_USER",
        "WP_APP_PASSWORD",
        "YT_SYNC_STATE_DIR",
        "YT_SYNC_TIMEZONE",
        "YT_SYNC_ENABLED",
        "YT_SYNC_MAX_PER_RUN",
        "YT_EDITORIAL_AI",
        "YT_EDITORIAL_API_KEY",
        "YT_EDITORIAL_API_URL",
        "YT_EDITORIAL_MODEL",
        "YT_EDITORIAL_APPLY",
        "WP_EDITORIAL_USER",
        "WP_EDITORIAL_APP_PASSWORD",
    ]
    return {key: os.environ.get(key, "").strip() for key in keys}


def build_report_decisions(actions: list[Action], zone: ZoneInfo, thumb: dict[str, object] | None) -> list[dict[str, object]]:
    preview_ids = {
        action.video.video_id
        for action in actions
        if action.reason in {"unverified-no-api", "bootstrap-required", "eligible"}
    }
    newest_preview = None
    if preview_ids:
        newest_preview = max(
            (action for action in actions if action.video.video_id in preview_ids),
            key=lambda action: action.video.published_at,
        ).video.video_id
    rows: list[dict[str, object]] = []
    for action in actions:
        row: dict[str, object] = {
            "video_id": action.video.video_id,
            "title": action.video.title,
            "published_at": action.video.published_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "decision": action.decision,
            "reason": action.reason,
            "source": action.video.source,
        }
        if action.video.duration_display:
            row["duree"] = action.video.duration_display
        if action.category_status:
            row["category_status"] = action.category_status
        if action.category_slug:
            row["category_slug"] = action.category_slug
            row["category_id"] = action.category_id
            row["category_name"] = action.category_name
        if action.category_candidates:
            row["category_candidates"] = list(action.category_candidates)
        if action.editorial_title:
            row["editorial_title"] = action.editorial_title
            row["editorial_summary"] = action.editorial_summary
            row["editorial_method"] = action.editorial_method
            row["editorial_needs_review"] = action.editorial_review
        if action.video.video_id == newest_preview:
            preview = action.payload_preview(zone)
            if preview:
                row["payload_preview"] = preview
            if thumb and thumb.get("video_id") == action.video.video_id:
                row["thumbnail_probe"] = {key: value for key, value in thumb.items() if key != "video_id"}
        rows.append(row)
    return rows


def known_stub(video_id: str, published: datetime, title: str) -> NormalizedVideo:
    return NormalizedVideo(
        video_id=video_id,
        title=title,
        description="",
        published_at=published,
        thumbnail_urls=thumbnail_fallbacks(video_id),
        duration_display=None,
        privacy_status=None,
        upload_status=None,
        live_broadcast_content=None,
        live_ended=None,
        embeddable=None,
        source="api",
    )


def collect_videos(
    http: HttpClient,
    channel_id: str,
    api_key: str,
    import_after: datetime | None,
    existing_ids: set[str],
) -> tuple[str, str | None, list[NormalizedVideo], int]:
    units = [0]
    if not api_key:
        title, videos = fetch_atom(http, channel_id)
        return "atom-preview", title, videos, 0
    playlist_id, snippet = fetch_uploads_playlist(http, api_key, channel_id, units)
    # Sans repère, une page suffit : on ne parcourt pas l'historique de la chaîne.
    max_pages = 1 if import_after is None else MAX_PLAYLIST_PAGES
    refs = list(
        iter_playlist_video_refs(
            http,
            api_key,
            playlist_id,
            import_after,
            units,
            max_pages,
        )
    )
    unknown = [video_id for video_id, _published, _title in refs if video_id not in existing_ids]
    details = fetch_video_details(http, api_key, unknown, units)
    by_id = {video.video_id: video for video in details}
    ordered: list[NormalizedVideo] = []
    for video_id, published, title in refs:
        if video_id in by_id:
            ordered.append(by_id[video_id])
        elif video_id in existing_ids:
            ordered.append(known_stub(video_id, published, title))
        else:
            LOG.info("fiche YouTube indisponible, ignorée : %s", video_id)
    channel_title = str(snippet.get("title") or "") or None
    return "youtube-data-api", channel_title, ordered, units[0]


def run_bootstrap(args: argparse.Namespace, env: dict[str, str]) -> int:
    state_dir = Path(args.state_dir or env.get("YT_SYNC_STATE_DIR") or "")
    if not str(state_dir):
        raise SyncError("YT_SYNC_STATE_DIR ou --state-dir est requis pour le bootstrap", EXIT_CONFIG)
    state_path, lock_path = state_paths(state_dir)
    with exclusive_lock(lock_path):
        current = load_state(state_path) if state_path.exists() else {}
        if current.get("bootstrapped_at") and not args.force_bootstrap:
            raise SyncError(
                "bootstrap déjà enregistré ; --force-bootstrap est requis pour le remplacer",
                EXIT_CONFIG,
            )
        import_after = parse_rfc3339(args.import_after) if args.import_after else datetime.now(timezone.utc)
        state = {
            "version": 1,
            "channel_id": env.get("YOUTUBE_CHANNEL_ID") or DEFAULT_CHANNEL_ID,
            "bootstrapped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "import_after": import_after.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "synced": current.get("synced") if isinstance(current.get("synced"), dict) else {},
        }
        save_state(state_path, state)
    LOG.info(
        "bootstrap enregistré, import_after=%s. Aucune vidéo WordPress n'a été créée.",
        state["import_after"],
    )
    json.dump({"ok": True, "import_after": state["import_after"], "state": str(state_path)}, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return EXIT_OK


def run_auth_check(env: dict[str, str]) -> int:
    if not env.get("WP_USER") or not env.get("WP_APP_PASSWORD"):
        raise SyncError("WP_USER et WP_APP_PASSWORD sont requis", EXIT_CONFIG)
    origin = env.get("WP_BASE_URL") or DEFAULT_WP_BASE
    http = HttpClient(allow_write=False)
    report = auth_check(http, origin, basic_auth_header(env["WP_USER"], env["WP_APP_PASSWORD"]))
    json.dump(report, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    if report["broader_than_expected"]:
        LOG.warning("le compte possède des droits plus larges que nécessaire : %s", ", ".join(report["broader_than_expected"]))
    return EXIT_OK


def execute(args: argparse.Namespace) -> int:
    env = env_settings()
    channel_id = env.get("YOUTUBE_CHANNEL_ID") or DEFAULT_CHANNEL_ID
    origin = (env.get("WP_BASE_URL") or DEFAULT_WP_BASE).rstrip("/")
    zone_name = env.get("YT_SYNC_TIMEZONE") or DEFAULT_TIMEZONE
    try:
        zone = ZoneInfo(zone_name)
    except Exception as exc:
        raise SyncError(f"fuseau invalide : {zone_name}") from exc
    state_dir_raw = args.state_dir or env.get("YT_SYNC_STATE_DIR") or ""
    state: dict = {}
    if state_dir_raw:
        state = load_state(state_paths(Path(state_dir_raw))[0])
    import_after = import_after_from_state(state)
    watermark_simulated = False
    if args.import_after and not args.bootstrap:
        import_after = parse_rfc3339(args.import_after)
        watermark_simulated = True
    allow_write = bool(args.apply)
    http = HttpClient(allow_write=allow_write)
    if args.apply:
        gate_errors = apply_gates(env, state if not watermark_simulated else {**state, "import_after": import_after.strftime("%Y-%m-%dT%H:%M:%SZ"), "bootstrapped_at": state.get("bootstrapped_at")})
        if watermark_simulated:
            gate_errors.append("import_after simulé : --apply refusé")
        if gate_errors:
            for item in gate_errors:
                LOG.error("%s", item)
            raise SyncError("activation refusée", EXIT_CONFIG)

    schema = fetch_wp_schema(http, origin)
    acf_ok, acf_fields = verify_acf_schema(schema)
    auth = None
    if env.get("WP_USER") and env.get("WP_APP_PASSWORD"):
        auth = basic_auth_header(env["WP_USER"], env["WP_APP_PASSWORD"])
    wp_total, existing_ids = fetch_existing_youtube_ids(http, origin, auth)
    existing_ids |= known_ids_from_state(state)
    api_key = env.get("YOUTUBE_API_KEY") or ""
    source, feed_title, videos, quota = collect_videos(http, channel_id, api_key, import_after if api_key else None, existing_ids)
    if not api_key:
        LOG.warning("clé YouTube absente : durée, confidentialité et directs non vérifiés, publication impossible")
    actions = [plan_action(video, existing_ids, import_after) for video in videos]
    actions.sort(key=lambda action: action.video.published_at)
    emissions, extras, missing = fetch_emission_catalog(http, origin)
    actions = annotate_categories(actions, emissions)
    ai = editorial.ai_settings_from_env(env, requested=bool(args.apply))
    actions = [with_editorial(action, zone, ai if action.decision == "create" else None) for action in actions]
    summary = summarize(actions)
    thumb = None
    if args.dry_run or not args.apply:
        newest = max(videos, key=lambda video: video.published_at, default=None)
        if newest:
            probed = probe_thumbnail(http, newest.thumbnail_urls)
            probed["video_id"] = newest.video_id
            thumb = probed
    report = RunReport(
        mode="apply" if args.apply else "dry-run",
        writes=False,
        channel_id=channel_id,
        wp_base_url=origin,
        source=source,
        api_key_present=bool(api_key),
        bootstrap_present=bool(state.get("bootstrapped_at")) and not watermark_simulated,
        import_after=import_after.strftime("%Y-%m-%dT%H:%M:%SZ") if import_after else None,
        watermark_simulated=watermark_simulated,
        wp_video_count=wp_total,
        wp_youtube_ids=len(existing_ids),
        acf_fields=acf_fields,
        acf_fields_ok=acf_ok,
        feed_channel_title=feed_title,
        quota_units_estimate=quota,
        summary=summary,
        notes=[],
    )
    if not acf_ok:
        report.notes.append("champs ACF attendus manquants : " + ", ".join(ACF_REQUIRED))
        if args.apply:
            raise SyncError("schéma ACF incompatible, aucune écriture", EXIT_CONFIG)
    if not state.get("bootstrapped_at") and not watermark_simulated:
        report.notes.append(
            "Sans bootstrap, aucune vidéo n'est importée, y compris celles déjà en ligne. "
            "Le repère import_after figera la limite une fois le bootstrap validé."
        )
    if source == "atom-preview":
        report.notes.append(
            "Le flux public ne fournit pas la durée, le statut privé/public ni l'état du direct. "
            "Ces vidéos restent non publiables tant que l'API YouTube ne les a pas vérifiées."
        )
    if missing:
        report.notes.append("pages d'émission sans catégorie WordPress : " + ", ".join(missing))
    if extras:
        report.notes.append(
            "catégories WordPress non liées à une page d'émission : "
            + ", ".join(str(row.get("slug")) for row in extras)
        )
    unclassified = [action.video.title for action in actions if action.decision == "create" and action.category_status == "unclassified"]
    if unclassified:
        report.notes.append(f"{len(unclassified)} vidéo(s) à créer resteront Non classé.")
    report.decisions = build_report_decisions(actions, zone, thumb)

    created = 0
    if args.apply:
        if not acf_ok:
            raise SyncError("schéma ACF incompatible", EXIT_CONFIG)
        if not state_dir_raw:
            raise SyncError("dossier d'état requis pour --apply", EXIT_CONFIG)
        if auth is None:
            raise SyncError("identifiants WordPress requis", EXIT_CONFIG)
        max_per_run = int(env.get("YT_SYNC_MAX_PER_RUN") or "5")
        eligible = [action for action in actions if action.decision == "create"]
        state_path, lock_path = state_paths(Path(state_dir_raw))
        with exclusive_lock(lock_path):
            state = load_state(state_path)
            _total, locked_ids = fetch_existing_youtube_ids(http, origin, auth)
            locked_ids |= known_ids_from_state(state)
            for action in eligible[:max_per_run]:
                if action.video.video_id in locked_ids:
                    LOG.info("déjà présente, création ignorée : %s", action.video.video_id)
                    continue
                media_id = None
                try:
                    _url, image = download_jpeg(http, action.video.thumbnail_urls)
                    media_id = upload_thumbnail(http, origin, auth, action.video, image)
                    body = build_post_body(
                        action.video,
                        zone,
                        featured_media=media_id,
                        category_id=action.category_id,
                        editorial_title=action.editorial_title,
                        editorial_summary=action.editorial_summary,
                    )
                    created_post = create_video_post(http, origin, auth, body)
                    wp_id = int(created_post["id"])
                    linked = confirm_link(http, origin, auth, wp_id, action.video.video_id, created_post)
                    remember_created(
                        state,
                        action.video.video_id,
                        wp_id,
                        linked,
                        "timer",
                        copy=copy_from_action(action),
                        youtube_title=action.video.title,
                        youtube_description=action.video.description,
                    )
                    save_state(state_path, state)
                    locked_ids.add(action.video.video_id)
                    created += 1
                    report.writes = True
                    if not linked:
                        LOG.critical(
                            "vidéo WP %s créée pour %s mais lien_video absent ; pas de second essai automatique",
                            wp_id,
                            action.video.video_id,
                        )
                    else:
                        LOG.info("créée wp_id=%s youtube=%s", wp_id, action.video.video_id)
                except Exception:
                    if media_id is not None:
                        delete_media(http, origin, auth, media_id)
                    raise
        if len(eligible) > max_per_run:
            LOG.info(
                "%s vidéos éligibles, %s créées, le reliquat attend le prochain passage",
                len(eligible),
                created,
            )
        report.summary["created"] = created

    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report.to_json(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        LOG.info("rapport écrit : %s", report_path)
    json.dump(report.to_json(), sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    LOG.info(
        "mode=%s source=%s wp=%s ids=%s vus=%s a_creer=%s",
        report.mode,
        report.source,
        report.wp_video_count,
        report.wp_youtube_ids,
        summary["seen"],
        summary["would_create"],
    )
    return EXIT_OK


def execute_history(args: argparse.Namespace) -> int:
    """Import unique d'une période. Ne modifie pas import_after."""
    env = env_settings()
    channel_id = env.get("YOUTUBE_CHANNEL_ID") or DEFAULT_CHANNEL_ID
    origin = (env.get("WP_BASE_URL") or DEFAULT_WP_BASE).rstrip("/")
    zone = ZoneInfo(env.get("YT_SYNC_TIMEZONE") or DEFAULT_TIMEZONE)
    start, end_exclusive = history_window(zone, args.history_from, args.history_to)
    api_key = env.get("YOUTUBE_API_KEY") or ""
    if not api_key:
        raise SyncError(
            "l'import historique exige YOUTUBE_API_KEY : le flux de 15 entrées ne couvre pas la période",
            EXIT_CONFIG,
        )
    state_dir_raw = str(args.state_dir or env.get("YT_SYNC_STATE_DIR") or "")
    state: dict = {}
    if state_dir_raw:
        state = load_state(state_paths(Path(state_dir_raw))[0])
    preserved_after = state.get("import_after")
    if args.apply:
        gate_errors = []
        if env.get("YT_SYNC_ENABLED") != "1":
            gate_errors.append("YT_SYNC_ENABLED doit valoir 1")
        if not env.get("WP_USER") or not env.get("WP_APP_PASSWORD"):
            gate_errors.append("WP_USER et WP_APP_PASSWORD sont requis")
        if not preserved_after:
            gate_errors.append("import_after absent : l'historique ne crée pas le repère du timer")
        if gate_errors:
            for item in gate_errors:
                LOG.error("%s", item)
            raise SyncError("import historique refusé", EXIT_CONFIG)
    http = HttpClient(allow_write=bool(args.apply))
    auth = None
    if env.get("WP_USER") and env.get("WP_APP_PASSWORD"):
        auth = basic_auth_header(env["WP_USER"], env["WP_APP_PASSWORD"])
    emissions, extras, missing = fetch_emission_catalog(http, origin)
    if missing and args.apply:
        raise SyncError("catalogue d'émissions incomplet : " + ", ".join(missing), EXIT_CONFIG)
    wp_total, existing_ids = fetch_existing_youtube_ids(http, origin, auth if args.apply else None)
    existing_ids |= known_ids_from_state(state)
    units = [0]
    playlist_id, snippet = fetch_uploads_playlist(http, api_key, channel_id, units)
    refs = list(
        iter_playlist_video_refs(
            http,
            api_key,
            playlist_id,
            None,
            units,
            HISTORY_MAX_PAGES,
            not_before=start,
            not_after=end_exclusive,
            strict=True,
        )
    )
    unknown = [video_id for video_id, _published, _title in refs if video_id not in existing_ids]
    details = {video.video_id: video for video in fetch_video_details(http, api_key, unknown, units)}
    videos: list[NormalizedVideo] = []
    for video_id, published, title in refs:
        if video_id in details:
            videos.append(details[video_id])
        elif video_id in existing_ids:
            videos.append(known_stub(video_id, published, title))
        else:
            LOG.info("fiche YouTube indisponible, ignorée : %s", video_id)
    actions = [
        plan_action(video, existing_ids, None, respect_watermark=False)
        for video in videos
    ]
    actions = annotate_categories(actions, emissions)
    ai = editorial.ai_settings_from_env(env, requested=bool(args.apply))
    actions = [with_editorial(action, zone, ai if action.decision == "create" else None) for action in actions]
    actions.sort(key=lambda action: action.video.published_at)
    history = summarize_history(actions)
    history["from"] = start.strftime("%Y-%m-%dT%H:%M:%SZ")
    history["to_inclusive"] = args.history_to
    history["timezone"] = str(zone)
    history["import_after"] = preserved_after
    history["catalog_missing"] = missing
    history["categories_without_programme"] = [
        {"id": row.get("id"), "slug": row.get("slug"), "name": row.get("name")} for row in extras
    ]
    report = RunReport(
        mode="history-apply" if args.apply else "history-dry-run",
        writes=False,
        channel_id=channel_id,
        wp_base_url=origin,
        source="youtube-data-api",
        api_key_present=True,
        bootstrap_present=bool(state.get("bootstrapped_at")),
        import_after=str(preserved_after) if preserved_after else None,
        watermark_simulated=False,
        wp_video_count=wp_total,
        wp_youtube_ids=len(existing_ids),
        feed_channel_title=str(snippet.get("title") or "") or None,
        quota_units_estimate=units[0],
        summary=summarize(actions),
        history=history,
        notes=[
            "Le repère import_after du timer n'est pas modifié.",
            "Les vidéos privées, non répertoriées, programmées, en direct ou non intégrables sont exclues.",
        ],
    )
    if missing:
        report.notes.append("pages d'émission sans catégorie : " + ", ".join(missing))
    report.decisions = build_report_decisions(actions, zone, None)
    created = 0
    if args.apply:
        if not state_dir_raw or auth is None:
            raise SyncError("dossier d'état et compte WordPress requis", EXIT_CONFIG)
        state_path, lock_path = state_paths(Path(state_dir_raw))
        eligible = [action for action in actions if action.decision == "create"]
        with exclusive_lock(lock_path):
            state = load_state(state_path)
            if state.get("import_after") != preserved_after:
                raise SyncError("import_after a changé pendant l'import", EXIT_ERROR)
            _total, locked_ids = fetch_existing_youtube_ids(http, origin, auth)
            locked_ids |= known_ids_from_state(state)
            for action in eligible:
                if action.video.video_id in locked_ids:
                    continue
                media_id = None
                try:
                    _url, image = download_jpeg(http, action.video.thumbnail_urls)
                    media_id = upload_thumbnail(http, origin, auth, action.video, image)
                    body = build_post_body(
                        action.video,
                        zone,
                        featured_media=media_id,
                        category_id=action.category_id if action.category_status == "matched" else None,
                        editorial_title=action.editorial_title,
                        editorial_summary=action.editorial_summary,
                    )
                    created_post = create_video_post(http, origin, auth, body)
                    wp_id = int(created_post["id"])
                    linked = confirm_link(http, origin, auth, wp_id, action.video.video_id, created_post)
                    remember_created(
                        state,
                        action.video.video_id,
                        wp_id,
                        linked,
                        "history",
                        copy=copy_from_action(action),
                        youtube_title=action.video.title,
                        youtube_description=action.video.description,
                    )
                    if state.get("import_after") != preserved_after:
                        raise SyncError("import_after a été modifié", EXIT_ERROR)
                    save_state(state_path, state)
                    locked_ids.add(action.video.video_id)
                    created += 1
                    report.writes = True
                    LOG.info("historique créé wp_id=%s youtube=%s", wp_id, action.video.video_id)
                except Exception:
                    if media_id is not None:
                        delete_media(http, origin, auth, media_id)
                    raise
        report.summary["created"] = created
    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report.to_json(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    json.dump(report.to_json(), sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    LOG.info(
        "historique mode=%s vues=%s deja=%s a_creer=%s import_after=%s",
        report.mode,
        history["youtube_in_window"],
        history["already_in_wordpress"],
        history["to_import"],
        preserved_after,
    )
    return EXIT_OK


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Synchronise les nouvelles vidéos YouTube vers WordPress (création seule).")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Aucune écriture WordPress (défaut).")
    mode.add_argument("--apply", action="store_true", help="Crée les vidéos manquantes. Refusé sans bootstrap et sans YT_SYNC_ENABLED=1.")
    mode.add_argument("--bootstrap", action="store_true", help="Enregistre le repère anti-historique, sans créer de vidéo.")
    mode.add_argument("--auth-check", action="store_true", help="Vérifie le compte WordPress sans créer de contenu.")
    parser.add_argument("--env-file", type=Path, help="Fichier KEY=VALUE hors du dépôt.")
    parser.add_argument("--state-dir", type=Path, help="Dossier d'état local, hors du dépôt Git.")
    parser.add_argument("--import-after", help="Repère ISO 8601. En dry-run il est simulé et n'est pas enregistré.")
    parser.add_argument("--force-bootstrap", action="store_true", help="Remplace un bootstrap existant.")
    parser.add_argument("--report", type=Path, help="Chemin du rapport JSON.")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--history", action="store_true", help="Import unique d'une période, sans changer import_after.")
    parser.add_argument("--history-from", default=HISTORY_FROM, help="Jour de début inclus, heure d'Abidjan.")
    parser.add_argument("--history-to", default=HISTORY_TO, help="Jour de fin inclus, heure d'Abidjan.")
    parser.add_argument("--editorial", action="store_true", help="Prévisualise ou réécrit les vidéos déjà importées.")
    parser.add_argument("--editorial-pack", type=Path, help="Applique les textes validés d'un fichier JSON, sans génération.")
    parser.add_argument("--editorial-restore", action="store_true", help="Restaure titre et contenu depuis une sauvegarde.")
    parser.add_argument("--backup", type=Path, help="Sauvegarde éditoriale à restaurer.")
    parser.add_argument("--with-ai", action="store_true", help="Autorise une génération IA pour les nouvelles vidéos ou l'aperçu généré.")
    parser.add_argument("--include-review", action="store_true", help="Inclut les fiches marquées requires_review. À n'utiliser qu'après validation.")
    parser.add_argument("--include-timer", action="store_true", help="Inclut aussi les vidéos créées par le timer.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.env_file:
        load_env_file(args.env_file)
    configure_logging(args.verbose or not args.apply)
    secrets = [
        os.environ.get("YOUTUBE_API_KEY", ""),
        os.environ.get("WP_APP_PASSWORD", ""),
        os.environ.get("WP_EDITORIAL_APP_PASSWORD", ""),
        os.environ.get("YT_EDITORIAL_API_KEY", ""),
    ]
    try:
        if args.bootstrap:
            return run_bootstrap(args, env_settings())
        if args.auth_check:
            return run_auth_check(env_settings())
        if args.editorial_restore:
            return editorial_backfill.execute_restore(args, sys.modules[__name__])
        if args.editorial_pack:
            return editorial_backfill.execute_pack(args, sys.modules[__name__])
        if args.editorial:
            return editorial_backfill.execute(args, sys.modules[__name__])
        if args.history and args.bootstrap:
            raise SyncError("historique et bootstrap sont incompatibles", EXIT_CONFIG)
        if not args.apply:
            args.dry_run = True
        if args.history:
            return execute_history(args)
        return execute(args)
    except SyncError as exc:
        LOG.error("%s", redact(str(exc), secrets))
        return exc.exit_code
    except WriteBlocked as exc:
        LOG.error("%s", redact(str(exc), secrets))
        return EXIT_ERROR
    except Exception as exc:
        LOG.exception("%s", redact(str(exc), secrets))
        return EXIT_ERROR


if __name__ == "__main__":
    sys.exit(main())
