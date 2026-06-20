#!/usr/bin/env python3
"""Build Phase 00 local platform payload snapshots.

The module intentionally uses only the Python standard library. Phase 00 does
not publish externally; it creates deterministic contract payloads that can be
reviewed and compared before live credentials are supplied.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
from pathlib import Path
from typing import Any

BASE = Path(__file__).resolve().parents[1]
FIXTURE_PATH = BASE / "fixtures" / "telegram-donika.json"
SNAPSHOT_DIR = BASE / "spikes" / "snapshots"

TELEGRAM_TEXT_LIMIT = 32768
TELEGRAM_MEDIA_LIMIT = 50
MAX_TEXT_LIMIT = 4000
INSTAGRAM_CAPTION_LIMIT = 2200


def load_fixture() -> dict[str, Any]:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def unicode_count(value: str) -> int:
    return len(value)


def media_items(fixture: dict[str, Any]) -> list[dict[str, str]]:
    """Create deterministic HTTPS placeholder media items for contract tests."""
    media = fixture["media"]
    items: list[dict[str, str]] = []
    for index in range(1, media["images"] + 1):
        items.append(
            {
                "kind": "image",
                "url": (
                    "https://media.example.invalid/chto-poest-armavir/"
                    f"telegram-donika/photo-{index:02d}.jpg"
                ),
            }
        )
    for index in range(1, media["videos"] + 1):
        items.append(
            {
                "kind": "video",
                "url": (
                    "https://media.example.invalid/chto-poest-armavir/"
                    f"telegram-donika/video-{index:02d}.mp4"
                ),
            }
        )
    return items


def render_telegram_rich_html(text: str, items: list[dict[str, str]]) -> str:
    blocks = ["<tg-collage>"]
    for item in items:
        escaped_url = html.escape(item["url"], quote=True)
        if item["kind"] == "image":
            blocks.append(f'  <img src="{escaped_url}"/>')
        elif item["kind"] == "video":
            blocks.append(f'  <video src="{escaped_url}"/>')
        else:  # pragma: no cover - defensive guard for future media kinds
            raise ValueError(f"Unsupported Telegram media kind: {item['kind']}")
    blocks.append("</tg-collage>")

    for paragraph in text.split("\n\n"):
        escaped = html.escape(paragraph, quote=False).replace("\n", "<br/>")
        blocks.append(f"<p>{escaped}</p>")
    return "\n".join(blocks)


def telegram_snapshot(fixture: dict[str, Any]) -> dict[str, Any]:
    items = media_items(fixture)
    rich_html = render_telegram_rich_html(fixture["text"], items)
    return {
        "schema_version": "1.0",
        "platform": "telegram",
        "fixture_key": fixture["fixture_key"],
        "mode": "rich_message",
        "method": "sendRichMessage",
        "live_status": "not_run_no_credentials",
        "text_char_count": unicode_count(fixture["text"]),
        "expected_text_char_count": fixture["expected_platform_count"],
        "rich_html_char_count": unicode_count(rich_html),
        "within_documented_rich_text_limit": unicode_count(rich_html)
        <= TELEGRAM_TEXT_LIMIT,
        "documented_limits": {
            "rich_text_max_chars": TELEGRAM_TEXT_LIMIT,
            "rich_media_max_items": TELEGRAM_MEDIA_LIMIT,
        },
        "media": {
            "total_items": len(items),
            "images": sum(item["kind"] == "image" for item in items),
            "videos": sum(item["kind"] == "video" for item in items),
            "urls_are_placeholders": True,
        },
        "rich_html": rich_html,
        "payload_hash": sha256_text(rich_html),
        "evidence": {
            "external_id": None,
            "screenshots": [],
            "note": "Local contract snapshot only; no Telegram API request was made.",
        },
    }


def adapt_max_text(text: str, max_chars: int = MAX_TEXT_LIMIT) -> tuple[str, list[str]]:
    removed: list[str] = []
    removable_prefixes = (
        "🟠🔥 Рекомендуйте канал друзьям!",
        "МАКС ",
        "🌐 Сайт:",
    )
    kept_lines: list[str] = []
    for line in text.splitlines():
        if any(line.startswith(prefix) for prefix in removable_prefixes):
            removed.append(line)
            continue
        kept_lines.append(line)

    candidate = "\n".join(kept_lines).rstrip()
    if unicode_count(candidate) <= max_chars:
        return candidate, removed

    paragraphs = candidate.split("\n\n")
    kept: list[str] = []
    suffix = "\n\n[Сокращено для лимита MAX]"
    for paragraph in paragraphs:
        trial = "\n\n".join([*kept, paragraph]).rstrip()
        if unicode_count(trial + suffix) <= max_chars:
            kept.append(paragraph)
            continue
        removed.append("Trailing paragraph removed to keep the MAX payload under 4,000 chars.")
        break
    return ("\n\n".join(kept).rstrip() + suffix).rstrip(), removed


def max_snapshot(fixture: dict[str, Any]) -> dict[str, Any]:
    text, removed = adapt_max_text(fixture["text"])
    items = media_items(fixture)
    upload_plan = []
    attachments = []
    for index, item in enumerate(items, start=1):
        upload_type = "image" if item["kind"] == "image" else "video"
        mock_token = f"mock-{upload_type}-{index:02d}-token"
        upload_plan.append(
            {
                "step": index,
                "media_kind": item["kind"],
                "request": {
                    "method": "POST",
                    "path": "/uploads",
                    "query": {"type": upload_type},
                    "headers": {"Authorization": "<redacted>"},
                },
                "upload_url": "https://upload.example.invalid/max/placeholder",
                "mock_token": mock_token,
                "readiness_strategy": (
                    "retry attachment.not.ready with exponential backoff"
                ),
            }
        )
        attachments.append({"type": upload_type, "payload": {"token": mock_token}})

    body = {"text": text, "attachments": attachments, "format": "html"}
    return {
        "schema_version": "1.0",
        "platform": "max",
        "fixture_key": fixture["fixture_key"],
        "live_status": "not_run_no_credentials",
        "text_char_count": unicode_count(text),
        "documented_limits": {"text_max_chars": MAX_TEXT_LIMIT},
        "within_documented_text_limit": unicode_count(text) <= MAX_TEXT_LIMIT,
        "adaptation": {
            "strategy": "remove_cross_channel_cta_lines_then_paragraph_boundary",
            "removed_points": removed,
        },
        "upload_plan": upload_plan,
        "message_request": {
            "method": "POST",
            "path": "/messages",
            "query": {"chat_id": "<MAX_CHAT_ID>"},
            "headers": {
                "Authorization": "<redacted>",
                "Content-Type": "application/json",
            },
            "body": body,
        },
        "observed_attachment_capability": {
            "status": "pending_live_test",
            "requested_mixed_media_items": len(items),
            "images": sum(item["kind"] == "image" for item in items),
            "videos": sum(item["kind"] == "video" for item in items),
        },
        "payload_hash": sha256_text(json_dumps(body)),
        "evidence": {
            "external_id": None,
            "note": "Local contract snapshot only; no MAX API request was made.",
        },
    }


def section_between(text: str, start_marker: str, stop_marker: str) -> list[str]:
    lines = text.splitlines()
    collecting = False
    collected: list[str] = []
    for line in lines:
        if line.startswith(start_marker):
            collecting = True
        if collecting:
            if line.startswith(stop_marker):
                break
            collected.append(line)
    return [line for line in collected if line.strip()]


def instagram_caption(text: str) -> str:
    lines = text.splitlines()
    lead = [lines[0]]
    context = [
        line
        for line in lines
        if line.startswith("🍽 Рубрика")
        or line.startswith("📍 ")
        or line.startswith("🧾 ")
    ]
    conclusion = section_between(text, "💬 Итог", "❓ ")
    question = [line for line in lines if line.startswith("❓ ")][:1]
    brand = [line for line in reversed(lines) if line.startswith("🍽 Что поесть?")][:1]
    caption = "\n".join([*lead, "", *context, "", *conclusion, "", *question, *brand])
    if unicode_count(caption) <= INSTAGRAM_CAPTION_LIMIT:
        return caption

    compact = "\n".join([*lead, "", *context, "", *question, *brand])
    if unicode_count(compact) <= INSTAGRAM_CAPTION_LIMIT:
        return compact

    return compact[: INSTAGRAM_CAPTION_LIMIT - 1].rstrip() + "…"


def instagram_snapshot(fixture: dict[str, Any]) -> dict[str, Any]:
    caption = instagram_caption(fixture["text"])
    items = media_items(fixture)
    children = []
    for index, item in enumerate(items, start=1):
        media_type = "IMAGE" if item["kind"] == "image" else "VIDEO"
        key = "image_url" if item["kind"] == "image" else "video_url"
        children.append(
            {
                "client_ref": f"donika-{index:02d}",
                "media_type": media_type,
                key: item["url"],
                "is_carousel_item": True,
            }
        )

    return {
        "schema_version": "1.0",
        "platform": "instagram",
        "fixture_key": fixture["fixture_key"],
        "live_status": "not_run_no_credentials",
        "readiness": {
            "professional_account": "missing",
            "meta_app": "missing",
            "oauth_redirect": "missing",
            "scopes": "missing",
            "app_review_status": "missing",
            "test_user": "missing",
            "content_publishing_quota": "not_queried",
        },
        "caption": caption,
        "caption_char_count": unicode_count(caption),
        "documented_limits": {
            "caption_max_chars": INSTAGRAM_CAPTION_LIMIT,
            "carousel_items_min": 2,
            "carousel_items_max": 10,
        },
        "within_documented_caption_limit": unicode_count(caption)
        <= INSTAGRAM_CAPTION_LIMIT,
        "container_plan": {
            "children": children,
            "parent": {
                "media_type": "CAROUSEL",
                "children": [
                    f"<child_container_id_{index:02d}>"
                    for index in range(1, len(children) + 1)
                ],
                "caption": caption,
            },
            "status_polling_required": True,
            "quota_check_required": True,
        },
        "payload_hash": sha256_text(json_dumps({"caption": caption, "children": children})),
        "evidence": {
            "external_id": None,
            "permalink": None,
            "note": "Local contract snapshot only; no Meta API request was made.",
        },
    }


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True)


def build_snapshots() -> dict[str, dict[str, Any]]:
    fixture = load_fixture()
    return {
        "telegram-donika-rich-message": telegram_snapshot(fixture),
        "max-donika-message": max_snapshot(fixture),
        "instagram-donika-carousel": instagram_snapshot(fixture),
    }


def write_snapshots() -> list[Path]:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for name, payload in build_snapshots().items():
        path = SNAPSHOT_DIR / f"{name}.json"
        path.write_text(json_dumps(payload) + "\n", encoding="utf-8")
        written.append(path)
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--write-snapshots",
        action="store_true",
        help="write deterministic JSON snapshots under spikes/snapshots/",
    )
    args = parser.parse_args()

    if args.write_snapshots:
        for path in write_snapshots():
            print(path.relative_to(BASE))
        return 0

    print(json_dumps(build_snapshots()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
