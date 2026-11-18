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
from datetime import datetime
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
ACRONYMS = {
    "RHDP",
    "PDCI",
    "RDA",
    "AMF",
    "ONG",
    "IA",
    "TV",
    "FIFA",
    "FIF",
    "ONU",
    "CNPS",
    "NISA",
    "SOTRA",
    "WAFA",
    "JT",
    "OFF",
}
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
    r"cliquez|lien en bio|rejoignez|toutes les plateformes|disponible sur|"
    r"lintelligent\.tv|24\s*/\s*24|en kiosque|média dont vous avez rêvé|programmes télés",
    re.IGNORECASE,
)
TOKEN_CASE_RE = re.compile(r"[A-Za-zÀ-ÿ0-9]+(?:['’-][A-Za-zÀ-ÿ0-9]+)*")
PACK_FIELDS = (
    "wp_id",
    "youtube_id",
    "original_title",
    "original_summary",
    "title",
    "summary",
    "requires_review",
)
GUEST_RE = re.compile(r"\b(?:avec|reçoit|recoit)\s+(.+)$", re.IGNORECASE)
TITLE_PREFIX_RE = re.compile(r"^\s*titre\s*:\s*", re.IGNORECASE)
TAG_RE = re.compile(r"<[^>]+>")
TOKEN_RE = re.compile(r"[a-z0-9]{4,}")


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
        if len(words) > 40:
            chosen = " ".join(words[:40]).rstrip(",;:") + "."
            return chosen, True, "Résumé raccourci à 40 mots. Vérification éditoriale conseillée."
        review = not 20 <= len(chosen.split()) <= 40
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


def case_forms(description: str, title: str) -> dict[str, str]:
    """Casse à conserver : un nom déjà écrit correctement prime sur un titre en capitales."""
    forms: dict[str, str] = {}
    for text in (title, description):
        for match in TOKEN_CASE_RE.finditer(text):
            raw = match.group(0)
            key = normalize_label(raw)
            letters = [char for char in raw if char.isalpha()]
            if not key or not letters:
                continue
            shouting = all(char.isupper() for char in letters)
            if shouting and 2 <= len(letters) <= 6 and key not in SMALL_WORDS:
                forms.setdefault(key, raw.upper() if raw.isalpha() else raw)
    for match in TOKEN_CASE_RE.finditer(description):
        raw = match.group(0)
        letters = [char for char in raw if char.isalpha()]
        if letters and not all(char.isupper() for char in letters):
            forms[normalize_label(raw)] = raw
    if re.search(r"\bJT\s+OFF\b", f"{title}\n{description}"):
        forms["jt off"] = "JT OFF"
    return forms


def restore_casing(text: str, forms: dict[str, str]) -> str:
    def replace(match: re.Match[str]) -> str:
        raw = match.group(0)
        return forms.get(normalize_label(raw), raw)

    return TOKEN_CASE_RE.sub(replace, text)


def emission_label(show_name: str, youtube_title: str) -> str:
    show = normalize_label(show_name)
    title = normalize_label(youtube_title)
    if show in {"l invite", "l invitee"}:
        if "invitee" in title:
            return "L'invitée"
        return show_name
    return show_name


def show_name_in_title(show_name: str, title: str) -> bool:
    show = normalize_label(show_name)
    titled = normalize_label(title)
    if show and show in titled:
        return True
    return show in {"l invite", "l invitee"} and ("l invite" in titled or "l invitee" in titled)


def fallback_editorial(source: EditorialSource) -> EditorialCopy:
    guest = extract_guest(source.youtube_title, source.show_name)
    when = french_date(source.published_at, source.zone)
    forms = case_forms(source.youtube_description, source.youtube_title)
    label = emission_label(source.show_name, source.youtube_title) if source.show_name else None
    if label:
        title = f"{label} du {when}"
        if guest:
            title += f" avec {restore_casing(guest, forms)}"
        else:
            raw = TITLE_PREFIX_RE.sub("", plain_text(source.youtube_title))
            topic = raw.split(":", 1)[1].strip() if ":" in raw else ""
            topic = polish_text(topic, names=False)
            show_norm = normalize_label(source.show_name)
            if topic and show_norm not in normalize_label(topic) and len(topic.split()) >= 3:
                title += f" : {topic[0].lower() + topic[1:] if topic[0].isupper() else topic}"
    else:
        title = restore_casing(clean_title(source.youtube_title), forms)
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


def mangled_acronyms(source_text: str, output: str) -> list[str]:
    damaged: list[str] = []
    for form in sorted(ACRONYMS):
        if not re.search(rf"\b{form}\b", source_text):
            continue
        if re.search(rf"\b{form}\b", output):
            continue
        if re.search(rf"\b{form}\b", output, flags=re.IGNORECASE):
            damaged.append(form)
    if "JT OFF" in source_text and "JT OFF" not in output and re.search(r"jt\s+off", output, re.I):
        damaged.append("JT OFF")
    return damaged


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
    if source.show_name and not show_name_in_title(source.show_name, title):
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
    if mangled_acronyms(f"{source.youtube_title}\n{source.youtube_description}", f"{title}\n{summary}"):
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


def texts_match(current: str, original: str) -> bool:
    if not str(original or "").strip():
        return False
    return normalize_label(plain_text(current)) == normalize_label(plain_text(original))


def content_unchanged(current_html: str, original: str) -> bool:
    """Vrai si le texte actuel contient encore le début du texte d'origine.

    La comparaison porte sur les mots, pas sur l'heure de modification.
    """
    probe = " ".join(normalize_label(plain_text(original)).split()[:12])
    if len(probe) < 24:
        return False
    return probe in normalize_label(plain_text(current_html))


def classify_backfill(entry: dict, post: dict | None, *, include_timer: bool) -> str:
    """Décide si une vidéo d'état peut recevoir une réécriture.

    Une modification humaine est un changement de titre ou de contenu par
    rapport au texte d'origine enregistré. L'heure de modification ne suffit pas.
    """
    source = str(entry.get("source") or "")
    allowed = {"history"}
    if include_timer:
        allowed.add("timer")
    if source not in allowed:
        return "skip-not-history"
    if not isinstance(post, dict):
        return "skip-missing"
    current_title = plain_text(str(post.get("title") or ""))
    current_content = str(post.get("content") or "")
    saved_title = plain_text(str(entry.get("editorial_title") or ""))
    if entry.get("editorial_applied_at") and saved_title:
        return "skip-already" if texts_match(current_title, saved_title) else "skip-manual"
    original_title = str(entry.get("youtube_title") or "")
    original_body = str(entry.get("youtube_description") or "")
    if not original_title:
        return "skip-unverified"
    if not texts_match(current_title, original_title):
        return "skip-manual"
    if original_body and not content_unchanged(current_content, original_body):
        return "skip-manual"
    return "update"


def load_editorial_pack(payload: object) -> list[dict]:
    if not isinstance(payload, dict) or not isinstance(payload.get("items"), list):
        raise ValueError("fichier éditorial illisible")
    items = payload["items"]
    if not items:
        raise ValueError("fichier éditorial vide")
    seen_wp: set[int] = set()
    seen_yt: set[str] = set()
    clean: list[dict] = []
    for item in items:
        if not isinstance(item, dict) or any(key not in item for key in PACK_FIELDS):
            raise ValueError("fiche éditoriale incomplète")
        wp_id = item["wp_id"]
        youtube_id = str(item["youtube_id"])
        if not isinstance(wp_id, int) or wp_id < 1 or not re.fullmatch(r"[A-Za-z0-9_-]{11}", youtube_id):
            raise ValueError("identifiant de fiche invalide")
        if not str(item["title"]).strip() or not str(item["summary"]).strip():
            raise ValueError("texte éditorial vide")
        if wp_id in seen_wp or youtube_id in seen_yt:
            raise ValueError("doublon dans le fichier éditorial")
        seen_wp.add(wp_id)
        seen_yt.add(youtube_id)
        clean.append(item)
    return clean


def classify_pack_item(item: dict, post: dict | None, *, in_state: bool, include_review: bool) -> str:
    if not in_state:
        return "skip-not-imported"
    if not isinstance(post, dict):
        return "skip-missing"
    if str(post.get("youtube_id") or "") != str(item.get("youtube_id") or ""):
        return "skip-id-mismatch"
    title = plain_text(str(post.get("title") or ""))
    content = str(post.get("content") or "")
    if texts_match(title, str(item.get("title") or "")) and content_unchanged(content, str(item.get("summary") or "")):
        return "skip-already"
    if item.get("requires_review") and not include_review:
        return "skip-review"
    if texts_match(title, str(item.get("original_title") or "")) and content_unchanged(
        content, str(item.get("original_summary") or "")
    ):
        return "update"
    return "skip-manual"


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
