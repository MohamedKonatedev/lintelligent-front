#!/usr/bin/env python3
"""Réécriture éditoriale à partir des métadonnées YouTube.

Le module ne regarde pas la vidéo. Il ne conserve une proposition d'IA que si
chaque fait contrôlable est déjà présent dans le titre, la description, le nom
d'émission ou la date de diffusion. Sinon il revient à une reformulation locale.
"""

from __future__ import annotations

import html
import json
import re
import unicodedata
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

MONTHS = (
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
)
ACRONYMS = {"RHDP", "PDCI", "RDA", "AMF", "ONG", "IA", "TV", "FIFA", "ONU"}
SMALL_WORDS = {
    "a",
    "au",
    "aux",
    "d",
    "de",
    "des",
    "du",
    "en",
    "et",
    "l",
    "la",
    "le",
    "les",
    "ou",
    "sur",
    "un",
    "une",
}
# Mots de liaison et verbes de formulation. Ils ne portent pas un fait nouveau.
STYLE_WORDS = SMALL_WORDS | {
    "abord",
    "aborde",
    "analyse",
    "analyses",
    "apres",
    "aujourdhui",
    "aussi",
    "autre",
    "autres",
    "avec",
    "cette",
    "cet",
    "ces",
    "comme",
    "dans",
    "decrypte",
    "depuis",
    "discuss",
    "discute",
    "dont",
    "echange",
    "emission",
    "entre",
    "est",
    "etre",
    "evoque",
    "explique",
    "face",
    "fait",
    "lors",
    "mais",
    "meme",
    "par",
    "parce",
    "pendant",
    "plus",
    "pour",
    "presente",
    "propose",
    "quand",
    "que",
    "qui",
    "revient",
    "sont",
    "tout",
    "toute",
    "vers",
    "video",
    "leurs",
    "leur",
    "sans",
    "sous",
    "chez",
    "dont",
    "ainsi",
    "alors",
    "encore",
    "autour",
    "sujet",
    "sujets",
}
PROMO_RE = re.compile(
    r"abonn|whatsapp|wa\.me|suivez[-\s]|likez|partagez|https?://|www\.|"
    r"cliquez|lien en bio|rejoignez|toutes les plateformes|disponible sur",
    re.IGNORECASE,
)
GUEST_RE = re.compile(r"\b(?:avec|reçoit|recoit)\s+(.+)$", re.IGNORECASE)
TITLE_PREFIX_RE = re.compile(r"^\s*titre\s*:\s*", re.IGNORECASE)
TAG_RE = re.compile(r"<[^>]+>")
TOKEN_RE = re.compile(r"[a-z0-9]{4,}")
MANUAL_GRACE = timedelta(minutes=20)


@dataclass(frozen=True)
class EditorialSource:
    youtube_title: str
    youtube_description: str
    show_name: str | None
    published_at: datetime
    zone: ZoneInfo


@dataclass(frozen=True)
class EditorialCopy:
    title: str
    summary: str
    method: str
    needs_review: bool
    note: str


@dataclass(frozen=True)
class AiSettings:
    url: str
    model: str
    api_key: str
    timeout: float = 25.0


def plain_text(value: str) -> str:
    text = html.unescape(TAG_RE.sub(" ", value or ""))
    return " ".join(text.replace("\xa0", " ").split())


def normalize_label(value: str) -> str:
    text = unicodedata.normalize("NFKD", value)
    text = "".join(char for char in text if not unicodedata.combining(char))
    for apostrophe in ("'", "’", "‘", "`", "´", "ʼ"):
        text = text.replace(apostrophe, "'")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def french_date(moment: datetime, zone: ZoneInfo) -> str:
    local = moment.astimezone(zone)
    return f"{local.day} {MONTHS[local.month - 1]} {local.year}"


def _shouting(word: str) -> bool:
    letters = [char for char in word if char.isalpha()]
    if not letters:
        return False
    return sum(char.isupper() for char in letters) / len(letters) >= 0.9


def _polish_core(core: str, *, capitalize: bool) -> str:
    if not core:
        return core
    if core.isalpha() and core.upper() in ACRONYMS:
        return core.upper()
    if "-" in core:
        return "-".join(_polish_core(part, capitalize=capitalize) for part in core.split("-"))
    pieces = re.split(r"([’'])", core)
    polished: list[str] = []
    for piece in pieces:
        if piece in {"'", "’"}:
            polished.append(piece)
            continue
        lower = piece.lower()
        if not lower:
            continue
        after_apostrophe = bool(polished and polished[-1] in {"'", "’"})
        if after_apostrophe and len(lower) == 1:
            polished.append(lower)
        elif capitalize or (after_apostrophe and capitalize):
            polished.append(lower[:1].upper() + lower[1:])
        else:
            polished.append(lower)
    return "".join(polished)


def _polish_word(word: str, *, capitalize: bool) -> str:
    if not _shouting(word):
        return word
    match = re.match(r"^([^A-Za-zÀ-ÿ0-9']*)(.*?)([^A-Za-zÀ-ÿ0-9']*)$", word)
    if not match:
        return word
    prefix, core, suffix = match.groups()
    if not core:
        return word
    lower = normalize_label(core)
    if not capitalize and lower in SMALL_WORDS:
        return prefix + core.lower() + suffix
    return prefix + _polish_core(core, capitalize=capitalize) + suffix


def polish_text(value: str, *, names: bool) -> str:
    words = " ".join(value.split()).split(" ")
    polished: list[str] = []
    for index, word in enumerate(words):
        capitalize = names or index == 0
        if names and normalize_label(word) in SMALL_WORDS and index > 0:
            capitalize = False
        polished.append(_polish_word(word, capitalize=capitalize))
    return " ".join(polished)


def clean_title(value: str) -> str:
    text = plain_text(value)
    text = TITLE_PREFIX_RE.sub("", text)
    text = text.strip(" «»\"")
    text = re.sub(r"\s*[:/|]\s*", " : ", text)
    text = re.sub(r"(?:\s*:\s*){2,}", " : ", text)
    text = " ".join(text.split()).strip(" :")
    if " : " in text:
        head, tail = text.split(" : ", 1)
        return polish_text(head, names=True) + " : " + polish_text(tail, names=False)
    return polish_text(text, names=False)


def extract_guest(title: str, show_name: str | None) -> str | None:
    head = plain_text(title).split(":", 1)[0]
    head = TITLE_PREFIX_RE.sub("", head)
    match = GUEST_RE.search(head)
    if not match:
        return None
    guest = " ".join(match.group(1).split()).strip(" -–—|,")
    if len(guest) < 2 or len(guest) > 80:
        return None
    if show_name and normalize_label(guest) == normalize_label(show_name):
        return None
    if normalize_label(guest) not in normalize_label(title):
        return None
    return polish_text(guest, names=True)


def _sentences(value: str, title: str = "") -> list[str]:
    text = plain_text(value)
    text = TITLE_PREFIX_RE.sub("", text)
    text = re.sub(r"https?://\S+|www\.\S+", ". ", text)
    parts = re.split(r"(?<=[.!?])\s+", " ".join(text.split()))
    title_norm = normalize_label(title)
    kept: list[str] = []
    for part in parts:
        sentence = part.strip(" -")
        if not sentence or PROMO_RE.search(sentence):
            continue
        sentence_norm = normalize_label(sentence)
        if title_norm and (sentence_norm == title_norm or sentence_norm.startswith(title_norm)):
            continue
        kept.append(sentence)
    return kept
    return kept


def factual_summary(source: EditorialSource, guest: str | None) -> tuple[str, bool, str]:
    sentences = _sentences(source.youtube_description, source.youtube_title)
    if sentences:
        chosen = sentences[0]
        words = chosen.split()
        if len(sentences) > 1 and len(words) < 20:
            extra = sentences[1].split()
            if len(words) + len(extra) <= 45:
                chosen = chosen.rstrip(".") + ". " + sentences[1]
                words = chosen.split()
        if len(words) > 60:
            chosen = " ".join(words[:40]).rstrip(",;:") + "."
            return chosen, True, "Résumé raccourci : vérification éditoriale conseillée."
        review = not 12 <= len(chosen.split()) <= 50
        note = "Reformulation limitée aux phrases déjà présentes dans la description YouTube."
        if review:
            note += " Vérification éditoriale conseillée."
        return chosen, review, note

    when = french_date(source.published_at, source.zone)
    if source.show_name and guest:
        summary = f"{source.show_name} du {when}, avec {guest}."
    elif source.show_name:
        summary = f"{source.show_name} du {when}."
    else:
        summary = clean_title(source.youtube_title).rstrip(".") + "."
    return (
        summary,
        True,
        "Sujet insuffisamment documenté dans les métadonnées. Vérification éditoriale nécessaire.",
    )


def fallback_editorial(source: EditorialSource) -> EditorialCopy:
    guest = extract_guest(source.youtube_title, source.show_name)
    when = french_date(source.published_at, source.zone)
    if source.show_name:
        title = f"{source.show_name} du {when}"
        if guest:
            title += f" avec {guest}"
        else:
            raw = TITLE_PREFIX_RE.sub("", plain_text(source.youtube_title))
            topic = raw.split(":", 1)[1].strip() if ":" in raw else ""
            topic = polish_text(topic, names=False)
            show_norm = normalize_label(source.show_name)
            if topic and show_norm not in normalize_label(topic) and len(topic.split()) >= 3:
                title += f" : {topic[0].lower() + topic[1:] if topic[0].isupper() else topic}"
    else:
        title = clean_title(source.youtube_title)
    summary, review, note = factual_summary(source, guest)
    if not title.strip():
        title = clean_title(source.youtube_title) or "Vidéo"
        review = True
        note = "Titre source vide. Vérification éditoriale nécessaire."
    return EditorialCopy(title=title, summary=summary, method="fallback", needs_review=review, note=note)


def _known_text(source: EditorialSource, guest: str | None) -> str:
    chunks = [
        source.youtube_title,
        source.youtube_description,
        source.show_name or "",
        french_date(source.published_at, source.zone),
        guest or "",
        " ".join(MONTHS),
    ]
    return normalize_label(" ".join(chunks))


def unsupported_tokens(text: str, known: str) -> list[str]:
    unknown: list[str] = []
    for token in TOKEN_RE.findall(normalize_label(text)):
        stem = token[:-1] if token.endswith("s") and len(token) > 4 else token
        if token in STYLE_WORDS or stem in STYLE_WORDS:
            continue
        if token in known or stem in known:
            continue
        unknown.append(token)
    return unknown


def validate_copy(copy: EditorialCopy, source: EditorialSource) -> EditorialCopy | None:
    title = " ".join(copy.title.split())
    summary = " ".join(copy.summary.split())
    if not title or len(title) > 160:
        return None
    if TITLE_PREFIX_RE.match(title) or title.isupper():
        return None
    words = summary.split()
    if not 8 <= len(words) <= 60:
        return None
    if "\n" in summary or PROMO_RE.search(title + " " + summary):
        return None
    if source.show_name and normalize_label(source.show_name) not in normalize_label(title):
        return None
    when = french_date(source.published_at, source.zone)
    if source.show_name and when not in title:
        return None
    guest = extract_guest(title, source.show_name)
    if guest and normalize_label(guest) not in normalize_label(source.youtube_title + " " + source.youtube_description):
        return None
    known = _known_text(source, guest)
    if unsupported_tokens(title, known) or unsupported_tokens(summary, known):
        return None
    review = copy.needs_review or not 20 <= len(words) <= 40
    note = copy.note or "Proposition contrôlée à partir des métadonnées YouTube."
    if review and "vérification" not in note.lower():
        note += " Vérification éditoriale conseillée."
    return EditorialCopy(title=title, summary=summary, method="ai", needs_review=review, note=note)


def _extract_json(raw: str) -> dict | None:
    text = raw.strip()
    fenced = re.search(r"\{.*\}", text, re.DOTALL)
    if not fenced:
        return None
    try:
        payload = json.loads(fenced.group(0))
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def call_ai(settings: AiSettings, source: EditorialSource) -> EditorialCopy | None:
    description = " ".join(_sentences(source.youtube_description, source.youtube_title))[:1200]
    payload = {
        "model": settings.model,
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Tu réécris des métadonnées de télévision en français. "
                    "Tu n'as pas vu la vidéo. Tu n'utilises que les faits fournis. "
                    "Tu n'inventes aucun nom, sujet, chiffre, citation ni date. "
                    "Réponds uniquement avec un objet JSON : "
                    '{"title":"...","summary":"...","needs_review":false}. '
                    "Le résumé fait une ou deux phrases, entre 20 et 40 mots, sans lien ni appel à s'abonner."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "emission": source.show_name,
                        "date_diffusion": french_date(source.published_at, source.zone),
                        "titre_youtube": plain_text(source.youtube_title)[:300],
                        "description_youtube": description,
                        "consigne_titre": (
                            "Si une émission est fournie, le titre commence par son nom exact, "
                            "puis « du » et la date fournie, puis « avec » l'invité seulement s'il est écrit dans les métadonnées."
                        ),
                    },
                    ensure_ascii=False,
                ),
            },
        ],
    }
    request = urllib.request.Request(
        settings.url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "lintelligent-tv-editorial",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=settings.timeout) as response:
            body = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return None
    choices = body.get("choices") if isinstance(body, dict) else None
    if not isinstance(choices, list) or not choices:
        return None
    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    content = message.get("content") if isinstance(message, dict) else None
    parsed = _extract_json(str(content or ""))
    if not parsed:
        return None
    candidate = EditorialCopy(
        title=str(parsed.get("title") or ""),
        summary=str(parsed.get("summary") or ""),
        method="ai",
        needs_review=bool(parsed.get("needs_review")),
        note="Proposition d'IA contrôlée contre les métadonnées.",
    )
    return validate_copy(candidate, source)


def compose_editorial(source: EditorialSource, ai: AiSettings | None) -> EditorialCopy:
    """Une génération au plus. L'échec de l'IA laisse le secours local."""
    local = fallback_editorial(source)
    if ai is None or not ai.api_key:
        return local
    generated = call_ai(ai, source)
    if generated is None:
        return EditorialCopy(
            title=local.title,
            summary=local.summary,
            method="fallback",
            needs_review=True,
            note="IA indisponible ou refusée. " + local.note,
        )
    return generated


def editorial_paragraph(summary: str) -> str:
    return '<p class="wp-block-paragraph">' + html.escape(plain_text(summary)) + "</p>"


def classify_backfill(entry: dict, post: dict | None, *, include_timer: bool) -> str:
    """Décide si une vidéo d'état peut recevoir une réécriture.

    Les vidéos absentes de l'état ne sont pas présentées ici : ce sont les
    publications antérieures au synchroniseur.
    """
    source = str(entry.get("source") or "")
    allowed = {"history"}
    if include_timer:
        allowed.add("timer")
    if source not in allowed:
        return "skip-not-history"
    if not isinstance(post, dict):
        return "skip-missing"
    try:
        modified = datetime.fromisoformat(str(post.get("modified_gmt") or "").replace("Z", "+00:00"))
        created = datetime.fromisoformat(str(post.get("date_gmt") or "").replace("Z", "+00:00"))
    except ValueError:
        return "skip-manual"
    if modified.tzinfo is None:
        modified = modified.replace(tzinfo=timezone.utc)
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    applied = str(entry.get("editorial_applied_at") or "")
    current_title = plain_text(str(post.get("title") or ""))
    if applied:
        if current_title == plain_text(str(entry.get("editorial_title") or "")):
            return "skip-already"
        return "skip-manual"
    if modified - created > MANUAL_GRACE:
        return "skip-manual"
    return "update"


def restore_body(item: dict) -> dict[str, str]:
    title = str(item.get("title") or "").strip()
    content = str(item.get("content") or "")
    if not title:
        raise ValueError("sauvegarde sans titre")
    return {"title": title, "content": content}


def ai_settings_from_env(env: dict[str, str], requested: bool) -> AiSettings | None:
    if not requested or env.get("YT_EDITORIAL_AI") != "1":
        return None
    key = env.get("YT_EDITORIAL_API_KEY") or ""
    if not key:
        return None
    return AiSettings(
        url=env.get("YT_EDITORIAL_API_URL") or "https://api.openai.com/v1/chat/completions",
        model=env.get("YT_EDITORIAL_MODEL") or "gpt-4o-mini",
        api_key=key,
    )
