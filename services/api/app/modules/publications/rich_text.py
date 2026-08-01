from __future__ import annotations

from html import escape
from typing import Any
from urllib.parse import urlsplit


RICH_TEXT_VERSION = 1
RICH_TEXT_MAX_SEGMENTS = 10_000
RICH_TEXT_MAX_CHARACTERS = 120_000
RICH_TEXT_MARK_ORDER = {"bold": 0, "italic": 1, "link": 2}


class RichTextValidationError(ValueError):
    pass


def _safe_url(value: object) -> str:
    if not isinstance(value, str):
        raise RichTextValidationError("Link URL must be a string.")
    href = value.strip()
    parsed = urlsplit(href)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise RichTextValidationError("Only absolute http:// and https:// links are allowed.")
    if any(character in href for character in ("\x00", "\r", "\n")):
        raise RichTextValidationError("Link URL contains forbidden control characters.")
    return href


def _normalize_marks(value: object) -> list[dict[str, str]]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise RichTextValidationError("Segment marks must be a list.")
    marks: dict[str, dict[str, str]] = {}
    for raw_mark in value:
        if not isinstance(raw_mark, dict):
            raise RichTextValidationError("Each rich-text mark must be an object.")
        mark_type = raw_mark.get("type")
        if mark_type not in RICH_TEXT_MARK_ORDER:
            raise RichTextValidationError("Unsupported rich-text mark.")
        if mark_type == "link":
            marks[mark_type] = {"type": "link", "href": _safe_url(raw_mark.get("href"))}
        else:
            marks[mark_type] = {"type": mark_type}
    return [marks[key] for key in sorted(marks, key=RICH_TEXT_MARK_ORDER.__getitem__)]


def normalize_rich_text(value: object) -> dict[str, Any]:
    if not isinstance(value, dict) or value.get("version") != RICH_TEXT_VERSION:
        raise RichTextValidationError("Unsupported rich-text document version.")
    raw_segments = value.get("segments")
    if not isinstance(raw_segments, list):
        raise RichTextValidationError("Rich-text document segments must be a list.")
    if len(raw_segments) > RICH_TEXT_MAX_SEGMENTS:
        raise RichTextValidationError("Rich-text document has too many segments.")

    normalized: list[dict[str, Any]] = []
    character_count = 0
    for raw_segment in raw_segments:
        if not isinstance(raw_segment, dict) or not isinstance(raw_segment.get("text"), str):
            raise RichTextValidationError("Each rich-text segment must contain text.")
        text = raw_segment["text"].replace("\r\n", "\n").replace("\r", "\n")
        if not text:
            continue
        character_count += len(text)
        if character_count > RICH_TEXT_MAX_CHARACTERS:
            raise RichTextValidationError("Rich-text document is too long.")
        marks = _normalize_marks(raw_segment.get("marks"))
        if normalized and normalized[-1]["marks"] == marks:
            normalized[-1]["text"] += text
        else:
            normalized.append({"text": text, "marks": marks})
    return {"version": RICH_TEXT_VERSION, "segments": normalized}


def plain_rich_text(text: str) -> dict[str, Any]:
    return normalize_rich_text({"version": RICH_TEXT_VERSION, "segments": [{"text": text}]})


def rich_text_plain(value: object) -> str:
    document = normalize_rich_text(value)
    return "".join(segment["text"] for segment in document["segments"])


def slice_rich_text(value: object, start: int = 0, end: int | None = None) -> dict[str, Any]:
    document = normalize_rich_text(value)
    total = rich_text_plain(document)
    normalized_start, normalized_end, _ = slice(start, end).indices(len(total))
    if normalized_end <= normalized_start:
        return {"version": RICH_TEXT_VERSION, "segments": []}
    cursor = 0
    segments: list[dict[str, Any]] = []
    for segment in document["segments"]:
        segment_end = cursor + len(segment["text"])
        left = max(normalized_start, cursor)
        right = min(normalized_end, segment_end)
        if left < right:
            segments.append(
                {
                    "text": segment["text"][left - cursor : right - cursor],
                    "marks": segment["marks"],
                }
            )
        cursor = segment_end
        if cursor >= normalized_end:
            break
    return normalize_rich_text({"version": RICH_TEXT_VERSION, "segments": segments})


def trim_rich_text(value: object) -> dict[str, Any]:
    document = normalize_rich_text(value)
    text = rich_text_plain(document)
    leading = len(text) - len(text.lstrip())
    trailing = len(text) - len(text.rstrip())
    return slice_rich_text(document, leading, len(text) - trailing if trailing else None)


def join_rich_text(*values: object, separator: str = "\n\n") -> dict[str, Any]:
    documents = [normalize_rich_text(value) for value in values if rich_text_plain(value)]
    segments: list[dict[str, Any]] = []
    for index, document in enumerate(documents):
        if index:
            segments.append({"text": separator, "marks": []})
        segments.extend(document["segments"])
    return normalize_rich_text({"version": RICH_TEXT_VERSION, "segments": segments})


def strip_rich_text_suffix(value: object, suffix: str) -> dict[str, Any]:
    document = normalize_rich_text(value)
    text = rich_text_plain(document)
    if suffix and text.endswith(suffix):
        end = len(text) - len(suffix)
        if text[:end].endswith("\n\n"):
            end -= 2
        return slice_rich_text(document, 0, end)
    return document


def rich_text_html(value: object) -> str:
    document = normalize_rich_text(value)
    rendered: list[str] = []
    for segment in document["segments"]:
        text = escape(segment["text"]).replace("\n", "<br>")
        marks = segment["marks"]
        if any(mark["type"] == "bold" for mark in marks):
            text = f"<strong>{text}</strong>"
        if any(mark["type"] == "italic" for mark in marks):
            text = f"<em>{text}</em>"
        link = next((mark for mark in marks if mark["type"] == "link"), None)
        if link is not None:
            text = f'<a href="{escape(link["href"], quote=True)}">{text}</a>'
        rendered.append(text)
    return "".join(rendered)


def rich_text_markdown(value: object) -> str:
    document = normalize_rich_text(value)
    rendered: list[str] = []
    for segment in document["segments"]:
        text = segment["text"]
        for character in ("\\", "*", "_", "[", "]", "(", ")"):
            text = text.replace(character, f"\\{character}")
        marks = segment["marks"]
        if any(mark["type"] == "bold" for mark in marks):
            text = f"**{text}**"
        if any(mark["type"] == "italic" for mark in marks):
            text = f"_{text}_"
        link = next((mark for mark in marks if mark["type"] == "link"), None)
        if link is not None:
            text = f'[{text}]({link["href"]})'
        rendered.append(text)
    return "".join(rendered)
