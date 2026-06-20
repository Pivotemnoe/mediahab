from __future__ import annotations

import html
import ipaddress
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote, urlparse

import httpx


class ConnectorValidationError(ValueError):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


@dataclass(frozen=True)
class ConnectorCapability:
    platform_key: str
    connector_key: str
    name: str
    hard_text_limit: int
    media_limit: int | None
    publication_mode: str
    automated_delivery: bool
    capabilities: dict[str, Any]
    hard_limits: dict[str, Any]


@dataclass(frozen=True)
class ConnectorResult:
    status: str
    external_id: str | None
    response_payload: dict[str, Any]
    retryable: bool = False
    error_code: str | None = None
    error_message: str | None = None


TELEGRAM_CONNECTOR_KEY = "telegram_rich_message"
TELEGRAM_RICH_TEXT_LIMIT = 32768
TELEGRAM_MEDIA_LIMIT = 50
TELEGRAM_FALLBACK_MEDIA_GROUP_LIMIT = 10
TELEGRAM_DELIVERY_URL_TTL_SECONDS = 24 * 60 * 60
MAX_CONNECTOR_KEY = "max_message"
MAX_TEXT_LIMIT = 4000
MAX_RATE_GUIDANCE_RPS = 30
INSTAGRAM_CONNECTOR_KEY = "instagram_media"
INSTAGRAM_CAPTION_LIMIT = 2200
INSTAGRAM_HASHTAG_LIMIT = 30
INSTAGRAM_MENTION_LIMIT = 20
INSTAGRAM_CAROUSEL_MIN = 2
INSTAGRAM_CAROUSEL_MAX = 10


CAPABILITIES: dict[str, ConnectorCapability] = {
    "telegram": ConnectorCapability(
        platform_key="telegram",
        connector_key=TELEGRAM_CONNECTOR_KEY,
        name="Telegram Rich Message",
        hard_text_limit=TELEGRAM_RICH_TEXT_LIMIT,
        media_limit=TELEGRAM_MEDIA_LIMIT,
        publication_mode="rich_message",
        automated_delivery=True,
        capabilities={
            "preview": True,
            "approval_required": True,
            "rich_message": True,
            "rich_html": True,
            "fallback_requires_approval": True,
            "fallback_modes": ["media_group_then_text"],
            "edit_delete_supported": {"rich_message": True, "fallback": "aggregate"},
            "native_connector_phase": 7,
        },
        hard_limits={
            "rich_text": TELEGRAM_RICH_TEXT_LIMIT,
            "media": TELEGRAM_MEDIA_LIMIT,
            "fallback_media_group": TELEGRAM_FALLBACK_MEDIA_GROUP_LIMIT,
            "delivery_url_ttl_seconds": TELEGRAM_DELIVERY_URL_TTL_SECONDS,
        },
    ),
    "max": ConnectorCapability(
        platform_key="max",
        connector_key=MAX_CONNECTOR_KEY,
        name="MAX Message",
        hard_text_limit=MAX_TEXT_LIMIT,
        media_limit=None,
        publication_mode="message",
        automated_delivery=True,
        capabilities={
            "preview": True,
            "approval_required": True,
            "html": True,
            "markdown": True,
            "media_upload": True,
            "attachment_readiness_retry": True,
            "webhooks": True,
            "media_count": "unknown_requires_live_spike",
            "native_connector_phase": 8,
        },
        hard_limits={
            "text": MAX_TEXT_LIMIT,
            "documented_request_rate_per_second": MAX_RATE_GUIDANCE_RPS,
            "media_count": "unknown_requires_live_spike",
        },
    ),
    "instagram": ConnectorCapability(
        platform_key="instagram",
        connector_key=INSTAGRAM_CONNECTOR_KEY,
        name="Instagram Media",
        hard_text_limit=INSTAGRAM_CAPTION_LIMIT,
        media_limit=INSTAGRAM_CAROUSEL_MAX,
        publication_mode="instagram_media",
        automated_delivery=False,
        capabilities={
            "preview": True,
            "approval_required": True,
            "single_image": True,
            "single_video": True,
            "reel": True,
            "carousel": True,
            "manual_required": True,
            "readiness_diagnostics": True,
            "live_feature_flag": False,
            "native_connector_phase": 9,
        },
        hard_limits={
            "caption": INSTAGRAM_CAPTION_LIMIT,
            "hashtags": INSTAGRAM_HASHTAG_LIMIT,
            "mentions": INSTAGRAM_MENTION_LIMIT,
            "carousel_min": INSTAGRAM_CAROUSEL_MIN,
            "carousel_max": INSTAGRAM_CAROUSEL_MAX,
        },
    ),
    "manual_export": ConnectorCapability(
        platform_key="manual_export",
        connector_key="manual_export",
        name="Ручной экспорт",
        hard_text_limit=100000,
        media_limit=None,
        publication_mode="manual_export",
        automated_delivery=False,
        capabilities={
            "preview": True,
            "approval_required": True,
            "package_export": True,
        },
        hard_limits={"text": 100000},
    ),
    "generic_webhook": ConnectorCapability(
        platform_key="generic_webhook",
        connector_key="generic_webhook",
        name="Generic webhook",
        hard_text_limit=100000,
        media_limit=None,
        publication_mode="generic_webhook",
        automated_delivery=True,
        capabilities={
            "preview": True,
            "approval_required": True,
            "signed_json": True,
            "simulated_delivery": True,
        },
        hard_limits={"text": 100000, "url_scheme": "https"},
    ),
}


def capability_for(platform_key: str) -> ConnectorCapability:
    try:
        return CAPABILITIES[platform_key]
    except KeyError as exc:
        raise ConnectorValidationError(
            "unsupported_platform",
            "Platform is not supported by the Phase 06 connector registry.",
            {"platform_key": platform_key},
        ) from exc


def all_capabilities() -> list[ConnectorCapability]:
    return list(CAPABILITIES.values())


def character_count(text: str) -> int:
    return len(text)


def _condensed_text(master_text: str, platform_key: str, limit: int) -> str:
    prefix = f"Сокращённая версия для {platform_key.upper()}:\n"
    suffix = "\n\n[сокращено под лимит площадки]"
    if len(prefix) + len(suffix) >= limit:
        return master_text[:limit]
    body_limit = limit - len(prefix) - len(suffix)
    return f"{prefix}{master_text[:body_limit].rstrip()}{suffix}"


def adapt_text_for_platform(master_text: str, platform_key: str) -> str:
    capability = capability_for(platform_key)
    if character_count(master_text) <= capability.hard_text_limit:
        return master_text
    if platform_key in {"max", "instagram"}:
        return _condensed_text(master_text, platform_key, capability.hard_text_limit)
    return master_text


def _instagram_hashtags(text: str) -> list[str]:
    return re.findall(r"(?<![\w])#[\w][\w_]*", text, flags=re.UNICODE)


def _instagram_mentions(text: str) -> list[str]:
    return re.findall(r"(?<![\w])@[\w][\w_.]*", text, flags=re.UNICODE)


def validate_variant(platform_key: str, text: str, media_count: int = 0) -> dict[str, Any]:
    capability = capability_for(platform_key)
    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    count = character_count(text)
    if count > capability.hard_text_limit:
        errors.append(
            {
                "code": "text_limit_exceeded",
                "message": "Text exceeds the connector hard limit.",
                "actual": count,
                "limit": capability.hard_text_limit,
            }
        )
    if capability.media_limit is not None and media_count > capability.media_limit:
        errors.append(
            {
                "code": "media_limit_exceeded",
                "message": "Media count exceeds the connector hard limit.",
                "actual": media_count,
                "limit": capability.media_limit,
            }
        )
    if platform_key == "instagram" and media_count == 1:
        warnings.append(
            {
                "code": "instagram_single_media",
                "message": "Instagram single media is valid for feed/Reels; carousel requires 2-10 media items.",
            }
        )
    if platform_key == "instagram":
        hashtag_count = len(_instagram_hashtags(text))
        mention_count = len(_instagram_mentions(text))
        if hashtag_count > INSTAGRAM_HASHTAG_LIMIT:
            errors.append(
                {
                    "code": "instagram_hashtag_limit_exceeded",
                    "message": "Instagram captions may contain at most 30 hashtags.",
                    "actual": hashtag_count,
                    "limit": INSTAGRAM_HASHTAG_LIMIT,
                }
            )
        if mention_count > INSTAGRAM_MENTION_LIMIT:
            errors.append(
                {
                    "code": "instagram_mention_limit_exceeded",
                    "message": "Instagram captions may contain at most 20 mentions.",
                    "actual": mention_count,
                    "limit": INSTAGRAM_MENTION_LIMIT,
                }
            )
        warnings.append(
            {
                "code": "instagram_live_acceptance_pending",
                "message": "Instagram media contract is available; live publication requires Meta readiness and remains feature-flagged.",
            }
        )
    if platform_key == "max":
        warnings.append(
            {
                "code": "max_live_acceptance_pending",
                "message": "MAX message contract is available; live mixed-media evidence is pending credentials.",
            }
        )
    if platform_key == "telegram":
        warnings.append(
            {
                "code": "telegram_live_acceptance_pending",
                "message": "Telegram Rich Message contract is available; live fixture evidence is pending credentials.",
            }
        )
    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "character_count": count,
        "hard_limit": capability.hard_text_limit,
        "media_count": media_count,
        "publication_mode": capability.publication_mode,
    }


def _target_chat(configuration: dict[str, Any]) -> str:
    raw = (
        configuration.get("channel_id")
        or configuration.get("channel_username")
        or configuration.get("chat_id")
    )
    target = str(raw or "").strip()
    if not target:
        raise ConnectorValidationError(
            "telegram_channel_required",
            "Telegram destination requires channel_id, channel_username, or chat_id.",
        )
    if target.startswith("@") or target.startswith("-100") or target.lstrip("-").isdigit():
        return target
    if " " in target:
        raise ConnectorValidationError(
            "telegram_channel_invalid",
            "Telegram channel target must be an ID or username.",
            {"target": target},
        )
    return f"@{target}"


def _telegram_delivery_mode(configuration: dict[str, Any]) -> str:
    mode = str(configuration.get("delivery_mode") or "simulate").strip().lower()
    if mode not in {"simulate", "live"}:
        raise ConnectorValidationError(
            "telegram_delivery_mode_invalid",
            "Telegram delivery_mode must be simulate or live.",
            {"delivery_mode": mode},
        )
    return mode


def _telegram_payload_mode(configuration: dict[str, Any]) -> str:
    mode = str(configuration.get("telegram_mode") or configuration.get("payload_mode") or "rich_message")
    mode = mode.strip().lower()
    if mode in {"fallback", "media_group_text", "media_group_then_text"}:
        mode = "fallback_media_group"
    if mode not in {"rich_message", "fallback_media_group"}:
        raise ConnectorValidationError(
            "telegram_payload_mode_invalid",
            "Telegram payload mode must be rich_message or fallback_media_group.",
            {"telegram_mode": mode},
        )
    return mode


def _validate_https_url(url: str, code: str, message: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ConnectorValidationError(code, message, {"url": url})


def _validate_telegram_destination_configuration(configuration: dict[str, Any]) -> None:
    _target_chat(configuration)
    delivery_mode = _telegram_delivery_mode(configuration)
    payload_mode = _telegram_payload_mode(configuration)
    base_url = str(configuration.get("media_delivery_base_url") or "").strip()
    if base_url:
        _validate_https_url(
            base_url,
            "telegram_media_delivery_https_required",
            "Telegram media delivery base URL must use HTTPS.",
        )
    if payload_mode == "fallback_media_group" and configuration.get("fallback_approved") is not True:
        raise ConnectorValidationError(
            "telegram_fallback_requires_approval",
            "Telegram media-group fallback requires explicit fallback_approved=true.",
        )
    if delivery_mode == "live" and not str(configuration.get("bot_token") or "").strip():
        raise ConnectorValidationError(
            "telegram_bot_token_required",
            "Telegram live delivery requires a bot token.",
        )


def _telegram_media_kind(media: dict[str, Any]) -> str:
    kind = str(media.get("kind") or "").lower()
    mime_type = str(media.get("mime_type") or "").lower()
    if kind == "image" or mime_type.startswith("image/"):
        return "photo"
    if kind == "video" or mime_type.startswith("video/"):
        return "video"
    raise ConnectorValidationError(
        "telegram_unsupported_media",
        "Telegram Rich Message currently supports image and video media in this connector.",
        {"kind": kind, "mime_type": mime_type},
    )


def _media_delivery_url(media: dict[str, Any], configuration: dict[str, Any]) -> str:
    explicit_url = str(media.get("public_url") or "").strip()
    if explicit_url:
        _validate_https_url(
            explicit_url,
            "telegram_media_url_https_required",
            "Telegram media URLs must use HTTPS.",
        )
        return explicit_url
    base_url = str(configuration.get("media_delivery_base_url") or "").strip().rstrip("/")
    storage_key = str(media.get("storage_key") or "").strip().lstrip("/")
    if not base_url or not storage_key:
        raise ConnectorValidationError(
            "telegram_media_delivery_url_required",
            "Telegram publication requires HTTPS media delivery URLs.",
            {"media_id": media.get("media_id")},
        )
    _validate_https_url(
        base_url,
        "telegram_media_delivery_https_required",
        "Telegram media delivery base URL must use HTTPS.",
    )
    return f"{base_url}/{quote(storage_key, safe='/-_.~')}"


def _telegram_media_payload(
    media_items: list[dict[str, Any]],
    configuration: dict[str, Any],
) -> list[dict[str, Any]]:
    if len(media_items) > TELEGRAM_MEDIA_LIMIT:
        raise ConnectorValidationError(
            "telegram_media_limit_exceeded",
            "Telegram Rich Message media count exceeds hard limit.",
            {"actual": len(media_items), "limit": TELEGRAM_MEDIA_LIMIT},
        )
    payload: list[dict[str, Any]] = []
    for index, media in enumerate(media_items):
        media_type = _telegram_media_kind(media)
        url = _media_delivery_url(media, configuration)
        payload.append(
            {
                "index": index,
                "sort_order": media.get("sort_order", index),
                "type": media_type,
                "url": url,
                "mime_type": media.get("mime_type"),
                "media_id": media.get("media_id"),
            }
        )
    return payload


def _rich_html(text: str, media_payload: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    if media_payload:
        media_tags = []
        for media in media_payload:
            src = html.escape(str(media["url"]), quote=True)
            if media["type"] == "video":
                media_tags.append(f'<video src="{src}"></video>')
            else:
                media_tags.append(f'<img src="{src}"/>')
        parts.append(f"<tg-collage>{''.join(media_tags)}</tg-collage>")
    escaped_text = html.escape(text, quote=False).replace("\n", "<br>")
    parts.append(f"<p>{escaped_text}</p>")
    return "".join(parts)


def build_telegram_rich_message_payload(
    *,
    publication_id: str,
    destination_id: str,
    text: str,
    configuration: dict[str, Any],
    idempotency_key: str,
    media_items: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if character_count(text) > TELEGRAM_RICH_TEXT_LIMIT:
        raise ConnectorValidationError(
            "telegram_text_limit_exceeded",
            "Telegram Rich Message text exceeds hard limit.",
            {"actual": character_count(text), "limit": TELEGRAM_RICH_TEXT_LIMIT},
        )
    target = _target_chat(configuration)
    media_payload = _telegram_media_payload(media_items or [], configuration)
    rich_html = _rich_html(text, media_payload)
    provider_request: dict[str, Any] = {
        "chat_id": target,
        "rich_message": {
            "html": rich_html,
            "skip_entity_detection": bool(configuration.get("skip_entity_detection", False)),
        },
    }
    if configuration.get("disable_notification") is not None:
        provider_request["disable_notification"] = bool(configuration.get("disable_notification"))
    if configuration.get("protect_content") is not None:
        provider_request["protect_content"] = bool(configuration.get("protect_content"))
    return {
        "mode": "rich_message",
        "bot_api_method": "sendRichMessage",
        "publication_id": publication_id,
        "destination_id": destination_id,
        "idempotency_key": idempotency_key,
        "request": provider_request,
        "media": media_payload,
        "character_count": character_count(text),
        "media_count": len(media_payload),
        "media_url_ttl_seconds": int(
            configuration.get("media_delivery_ttl_seconds") or TELEGRAM_DELIVERY_URL_TTL_SECONDS
        ),
        "live_acceptance": "pending_without_credentials",
    }


def build_telegram_fallback_payload(
    *,
    publication_id: str,
    destination_id: str,
    text: str,
    configuration: dict[str, Any],
    idempotency_key: str,
    media_items: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if configuration.get("fallback_approved") is not True:
        raise ConnectorValidationError(
            "telegram_fallback_requires_approval",
            "Telegram media-group fallback requires explicit fallback_approved=true.",
        )
    media_payload = _telegram_media_payload(media_items or [], configuration)
    if not 2 <= len(media_payload) <= TELEGRAM_FALLBACK_MEDIA_GROUP_LIMIT:
        raise ConnectorValidationError(
            "telegram_fallback_media_count_invalid",
            "Telegram fallback media group requires 2-10 media items.",
            {"actual": len(media_payload), "limit": TELEGRAM_FALLBACK_MEDIA_GROUP_LIMIT},
        )
    target = _target_chat(configuration)
    media_group = [
        {"type": media["type"], "media": media["url"]}
        for media in media_payload
    ]
    return {
        "mode": "fallback_media_group",
        "bot_api_methods": ["sendMediaGroup", "sendMessage"],
        "publication_id": publication_id,
        "destination_id": destination_id,
        "idempotency_key": idempotency_key,
        "requests": [
            {"method": "sendMediaGroup", "chat_id": target, "media": media_group},
            {"method": "sendMessage", "chat_id": target, "text": text},
        ],
        "media": media_payload,
        "character_count": character_count(text),
        "media_count": len(media_payload),
        "media_url_ttl_seconds": int(
            configuration.get("media_delivery_ttl_seconds") or TELEGRAM_DELIVERY_URL_TTL_SECONDS
        ),
        "live_acceptance": "pending_without_credentials",
    }


def _max_delivery_mode(configuration: dict[str, Any]) -> str:
    mode = str(configuration.get("delivery_mode") or "simulate").strip().lower()
    if mode not in {"simulate", "live"}:
        raise ConnectorValidationError(
            "max_delivery_mode_invalid",
            "MAX delivery_mode must be simulate or live.",
            {"delivery_mode": mode},
        )
    return mode


def _max_format(configuration: dict[str, Any]) -> str:
    value = str(configuration.get("format") or "html").strip().lower()
    if value not in {"html", "markdown"}:
        raise ConnectorValidationError(
            "max_format_invalid",
            "MAX format must be html or markdown.",
            {"format": value},
        )
    return value


def _max_chat_id(configuration: dict[str, Any]) -> str:
    raw = configuration.get("chat_id")
    value = str(raw or "").strip()
    if not value:
        raise ConnectorValidationError(
            "max_chat_id_required",
            "MAX destination requires chat_id; current MAX API no longer lists chats.",
        )
    if not value.lstrip("-").isdigit():
        raise ConnectorValidationError(
            "max_chat_id_invalid",
            "MAX chat_id must be an integer ID.",
            {"chat_id": value},
        )
    return value


def _validate_max_webhook_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ConnectorValidationError(
            "max_webhook_https_required",
            "MAX webhook URL must use HTTPS.",
            {"url": url},
        )
    try:
        port = parsed.port
    except ValueError as exc:
        raise ConnectorValidationError(
            "max_webhook_port_forbidden",
            "MAX webhook URL must use port 443.",
        ) from exc
    if port not in {None, 443}:
        raise ConnectorValidationError(
            "max_webhook_port_forbidden",
            "MAX webhook URL must use port 443.",
            {"port": port},
        )
    if parsed.username or parsed.password:
        raise ConnectorValidationError(
            "max_webhook_credentials_in_url",
            "MAX webhook URL must not contain credentials.",
        )
    query = parsed.query.lower()
    if "token=" in query or "access_token=" in query:
        raise ConnectorValidationError(
            "max_token_in_query_forbidden",
            "MAX tokens must be sent only in the Authorization header.",
        )


def _validate_max_secret(secret: str) -> None:
    if not 5 <= len(secret) <= 256:
        raise ConnectorValidationError(
            "max_webhook_secret_invalid",
            "MAX webhook secret must be 5-256 characters.",
        )
    allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-")
    if any(character not in allowed for character in secret):
        raise ConnectorValidationError(
            "max_webhook_secret_invalid",
            "MAX webhook secret may contain only letters, digits, underscore, and hyphen.",
        )


def _validate_max_destination_configuration(configuration: dict[str, Any]) -> None:
    _max_chat_id(configuration)
    _max_format(configuration)
    delivery_mode = _max_delivery_mode(configuration)
    webhook_url = str(configuration.get("webhook_url") or "").strip()
    if webhook_url:
        _validate_max_webhook_url(webhook_url)
    webhook_secret = str(configuration.get("webhook_secret") or "").strip()
    if webhook_secret:
        _validate_max_secret(webhook_secret)
    if delivery_mode == "live" and not str(configuration.get("access_token") or "").strip():
        raise ConnectorValidationError(
            "max_access_token_required",
            "MAX live delivery requires an access token.",
        )


def _max_media_type(media: dict[str, Any]) -> str:
    kind = str(media.get("kind") or "").lower()
    mime_type = str(media.get("mime_type") or "").lower()
    if kind == "image" or mime_type.startswith("image/"):
        return "image"
    if kind == "video" or mime_type.startswith("video/"):
        return "video"
    if kind == "audio" or mime_type.startswith("audio/"):
        return "audio"
    return "file"


def _max_text_for_format(text: str, text_format: str) -> str:
    if text_format == "html":
        return html.escape(text, quote=False).replace("\n", "<br>")
    return text


def build_max_message_payload(
    *,
    publication_id: str,
    destination_id: str,
    text: str,
    configuration: dict[str, Any],
    idempotency_key: str,
    media_items: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    count = character_count(text)
    if count > MAX_TEXT_LIMIT:
        raise ConnectorValidationError(
            "max_text_limit_exceeded",
            "MAX text exceeds the 4,000-character hard limit.",
            {"actual": count, "limit": MAX_TEXT_LIMIT},
        )
    chat_id = _max_chat_id(configuration)
    text_format = _max_format(configuration)
    uploads: list[dict[str, Any]] = []
    attachments: list[dict[str, Any]] = []
    configured_tokens = configuration.get("media_tokens")
    token_map = configured_tokens if isinstance(configured_tokens, dict) else {}
    for index, media in enumerate(media_items or []):
        media_type = _max_media_type(media)
        media_id = str(media.get("media_id") or index)
        token = str(token_map.get(media_id) or f"simulated-max-token-{index + 1}")
        uploads.append(
            {
                "index": index,
                "method": "POST /uploads",
                "type": media_type,
                "authorization": "header_only",
                "storage_key": media.get("storage_key"),
                "mime_type": media.get("mime_type"),
                "readiness": "ready",
            }
        )
        attachments.append({"type": media_type, "payload": {"token": token}})
    body: dict[str, Any] = {
        "text": _max_text_for_format(text, text_format),
        "format": text_format,
        "attachments": attachments,
        "notify": bool(configuration.get("notify", True)),
    }
    return {
        "mode": "message",
        "bot_api_method": "POST /messages",
        "publication_id": publication_id,
        "destination_id": destination_id,
        "idempotency_key": idempotency_key,
        "request": {
            "method": "POST",
            "url": "https://platform-api.max.ru/messages",
            "query": {"chat_id": chat_id},
            "headers": {"Authorization": "***redacted***", "Content-Type": "application/json"},
            "body": body,
        },
        "uploads": uploads,
        "attachments": attachments,
        "character_count": count,
        "media_count": len(attachments),
        "media_count_limit": "unknown_requires_live_spike",
        "rate_guidance_rps": MAX_RATE_GUIDANCE_RPS,
        "live_acceptance": "pending_without_credentials",
    }


def _instagram_delivery_mode(configuration: dict[str, Any]) -> str:
    raw = str(configuration.get("delivery_mode") or "manual_required").strip().lower()
    if raw in {"manual", "manual_required", "prepared"}:
        return "manual_required"
    if raw != "live":
        raise ConnectorValidationError(
            "instagram_delivery_mode_invalid",
            "Instagram delivery_mode must be manual_required or live.",
            {"delivery_mode": raw},
        )
    return raw


def _instagram_media_mode(configuration: dict[str, Any]) -> str:
    mode = str(configuration.get("media_mode") or "auto").strip().lower()
    if mode not in {"auto", "image", "video", "reel", "carousel"}:
        raise ConnectorValidationError(
            "instagram_media_mode_invalid",
            "Instagram media_mode must be auto, image, video, reel, or carousel.",
            {"media_mode": mode},
        )
    return mode


def _validate_instagram_destination_configuration(
    configuration: dict[str, Any],
    *,
    can_activate_live: bool = False,
) -> None:
    delivery_mode = _instagram_delivery_mode(configuration)
    _instagram_media_mode(configuration)
    base_url = str(configuration.get("media_delivery_base_url") or "").strip()
    if base_url:
        _validate_https_url(
            base_url,
            "instagram_media_delivery_https_required",
            "Instagram media delivery base URL must use HTTPS.",
        )
    if delivery_mode != "live":
        return
    if not can_activate_live:
        raise ConnectorValidationError(
            "instagram_live_requires_owner_admin",
            "Only owner/admin may activate Instagram live delivery.",
        )
    if configuration.get("instagram_live_enabled") is not True:
        raise ConnectorValidationError(
            "instagram_live_feature_flag_disabled",
            "Instagram live publication remains feature-flagged until Meta readiness is verified.",
        )
    required_truthy = {
        "professional_account": "Instagram live delivery requires a professional account.",
        "meta_app_connected": "Instagram live delivery requires a connected Meta app.",
        "oauth_connected": "Instagram live delivery requires OAuth connection.",
        "permissions_ready": "Instagram live delivery requires approved publishing permissions.",
        "app_review_ready": "Instagram live delivery requires Meta app review approval.",
        "quota_checked": "Instagram live delivery requires a current content publishing quota check.",
    }
    for key, message in required_truthy.items():
        if configuration.get(key) is not True:
            raise ConnectorValidationError(f"instagram_{key}_required", message)
    if not str(configuration.get("account_id") or configuration.get("ig_user_id") or "").strip():
        raise ConnectorValidationError(
            "instagram_account_id_required",
            "Instagram live delivery requires an IG user/account ID.",
        )
    if not str(configuration.get("access_token") or configuration.get("meta_access_token") or "").strip():
        raise ConnectorValidationError(
            "instagram_access_token_required",
            "Instagram live delivery requires a Meta access token.",
        )
    if not base_url:
        raise ConnectorValidationError(
            "instagram_media_delivery_url_required",
            "Instagram live delivery requires public HTTPS media delivery URLs.",
        )


def _instagram_media_kind(media: dict[str, Any]) -> str:
    kind = str(media.get("kind") or "").lower()
    mime_type = str(media.get("mime_type") or "").lower()
    if kind == "image" or mime_type.startswith("image/"):
        return "image"
    if kind == "video" or mime_type.startswith("video/"):
        return "video"
    raise ConnectorValidationError(
        "instagram_unsupported_media",
        "Instagram media connector supports image and video media.",
        {"kind": kind, "mime_type": mime_type},
    )


def _instagram_media_url(media: dict[str, Any], configuration: dict[str, Any]) -> str | None:
    explicit_url = str(media.get("public_url") or "").strip()
    if explicit_url:
        _validate_https_url(
            explicit_url,
            "instagram_media_url_https_required",
            "Instagram media URLs must use HTTPS.",
        )
        return explicit_url
    base_url = str(configuration.get("media_delivery_base_url") or "").strip().rstrip("/")
    storage_key = str(media.get("storage_key") or "").strip().lstrip("/")
    if not base_url or not storage_key:
        return None
    _validate_https_url(
        base_url,
        "instagram_media_delivery_https_required",
        "Instagram media delivery base URL must use HTTPS.",
    )
    return f"{base_url}/{quote(storage_key)}"


def _instagram_readiness_diagnostics(
    configuration: dict[str, Any],
    media_items: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    diagnostics: list[dict[str, Any]] = []
    checks = [
        ("professional_account", "instagram_professional_account_required", "Connect an Instagram professional account."),
        ("meta_app_connected", "instagram_meta_app_required", "Connect the Meta app that owns Instagram publishing."),
        ("oauth_connected", "instagram_oauth_required", "Complete Meta OAuth for the selected account."),
        ("permissions_ready", "instagram_permissions_required", "Approve Instagram publishing scopes before live delivery."),
        ("app_review_ready", "instagram_app_review_required", "Complete Meta app review before live delivery."),
        ("quota_checked", "instagram_quota_check_required", "Check the current content publishing quota before live delivery."),
    ]
    for key, code, message in checks:
        if configuration.get(key) is not True:
            diagnostics.append({"code": code, "message": message, "blocking": True})
    if _instagram_delivery_mode(configuration) != "live" or configuration.get("instagram_live_enabled") is not True:
        diagnostics.append(
            {
                "code": "instagram_live_feature_flag_disabled",
                "message": "Live Instagram publication is feature-flagged; use the manual package until owner approval.",
                "blocking": True,
            }
        )
    else:
        diagnostics.append(
            {
                "code": "instagram_live_adapter_not_enabled",
                "message": "Instagram live adapter requires a separate Meta live spike before automatic delivery.",
                "blocking": True,
            }
        )
    if not media_items:
        diagnostics.append(
            {
                "code": "instagram_media_required",
                "message": "Instagram publication requires at least one image or video.",
                "blocking": True,
            }
        )
    return diagnostics


def _instagram_mode_for_media(configuration: dict[str, Any], media_items: list[dict[str, Any]]) -> str:
    requested = _instagram_media_mode(configuration)
    count = len(media_items)
    if requested == "carousel":
        if not INSTAGRAM_CAROUSEL_MIN <= count <= INSTAGRAM_CAROUSEL_MAX:
            raise ConnectorValidationError(
                "instagram_carousel_media_count_invalid",
                "Instagram carousel requires 2-10 media items.",
                {"actual": count, "min": INSTAGRAM_CAROUSEL_MIN, "max": INSTAGRAM_CAROUSEL_MAX},
            )
        return "carousel"
    if requested in {"image", "video", "reel"}:
        if count != 1:
            raise ConnectorValidationError(
                "instagram_single_media_count_invalid",
                "Instagram image, video, and Reel modes require exactly one media item.",
                {"actual": count},
            )
        kind = _instagram_media_kind(media_items[0])
        if requested == "image" and kind != "image":
            raise ConnectorValidationError(
                "instagram_image_media_required",
                "Instagram image mode requires an image media item.",
            )
        if requested in {"video", "reel"} and kind != "video":
            raise ConnectorValidationError(
                "instagram_video_media_required",
                "Instagram video/Reel mode requires a video media item.",
            )
        return requested
    if count == 0:
        return "missing_media"
    if count == 1:
        return _instagram_media_kind(media_items[0])
    if count > INSTAGRAM_CAROUSEL_MAX:
        raise ConnectorValidationError(
            "instagram_carousel_media_count_invalid",
            "Instagram carousel supports at most 10 media items.",
            {"actual": count, "max": INSTAGRAM_CAROUSEL_MAX},
        )
    return "carousel"


def _instagram_container_body(
    *,
    mode: str,
    caption: str,
    media: dict[str, Any] | None,
    media_url: str | None,
    children: list[str] | None = None,
) -> dict[str, Any]:
    if mode == "image":
        return {"media_type": "IMAGE", "image_url": media_url or "manual_package_reference", "caption": caption}
    if mode == "video":
        return {"media_type": "VIDEO", "video_url": media_url or "manual_package_reference", "caption": caption}
    if mode == "reel":
        return {"media_type": "REELS", "video_url": media_url or "manual_package_reference", "caption": caption}
    if mode == "carousel":
        return {"media_type": "CAROUSEL", "children": children or [], "caption": caption}
    return {"media_type": "UNKNOWN", "caption": caption, "source": media}


def build_instagram_media_payload(
    *,
    publication_id: str,
    destination_id: str,
    text: str,
    configuration: dict[str, Any],
    idempotency_key: str,
    media_items: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    count = character_count(text)
    if count > INSTAGRAM_CAPTION_LIMIT:
        raise ConnectorValidationError(
            "instagram_caption_limit_exceeded",
            "Instagram caption exceeds the 2,200-character hard limit.",
            {"actual": count, "limit": INSTAGRAM_CAPTION_LIMIT},
        )
    hashtag_count = len(_instagram_hashtags(text))
    mention_count = len(_instagram_mentions(text))
    if hashtag_count > INSTAGRAM_HASHTAG_LIMIT:
        raise ConnectorValidationError(
            "instagram_hashtag_limit_exceeded",
            "Instagram captions may contain at most 30 hashtags.",
            {"actual": hashtag_count, "limit": INSTAGRAM_HASHTAG_LIMIT},
        )
    if mention_count > INSTAGRAM_MENTION_LIMIT:
        raise ConnectorValidationError(
            "instagram_mention_limit_exceeded",
            "Instagram captions may contain at most 20 mentions.",
            {"actual": mention_count, "limit": INSTAGRAM_MENTION_LIMIT},
        )
    items = media_items or []
    mode = _instagram_mode_for_media(configuration, items)
    account_id = str(configuration.get("account_id") or configuration.get("ig_user_id") or "{ig-user-id}")
    media_plan: list[dict[str, Any]] = []
    for index, media in enumerate(items):
        media_plan.append(
            {
                "index": index,
                "kind": _instagram_media_kind(media),
                "storage_key": media.get("storage_key"),
                "mime_type": media.get("mime_type"),
                "url": _instagram_media_url(media, configuration),
            }
        )
    child_container_ids = [f"{{child-container-{index + 1}}}" for index in range(len(media_plan))]
    containers: list[dict[str, Any]] = []
    if mode == "carousel":
        for child_id, media in zip(child_container_ids, media_plan, strict=False):
            child_mode = "image" if media["kind"] == "image" else "video"
            body = _instagram_container_body(
                mode=child_mode,
                caption="",
                media=media,
                media_url=media["url"],
            )
            body["is_carousel_item"] = True
            containers.append(
                {
                    "id": child_id,
                    "step": "create_carousel_child",
                    "method": f"POST /{account_id}/media",
                    "body": body,
                }
            )
        containers.append(
            {
                "id": "{carousel-container-id}",
                "step": "create_carousel_parent",
                "method": f"POST /{account_id}/media",
                "body": _instagram_container_body(
                    mode="carousel",
                    caption=text,
                    media=None,
                    media_url=None,
                    children=child_container_ids,
                ),
            }
        )
        publish_container_id = "{carousel-container-id}"
    elif mode in {"image", "video", "reel"}:
        media = media_plan[0]
        containers.append(
            {
                "id": "{container-id}",
                "step": "create_media_container",
                "method": f"POST /{account_id}/media",
                "body": _instagram_container_body(
                    mode=mode,
                    caption=text,
                    media=media,
                    media_url=media["url"],
                ),
            }
        )
        publish_container_id = "{container-id}"
    else:
        publish_container_id = None
    diagnostics = _instagram_readiness_diagnostics(configuration, items)
    return {
        "mode": mode,
        "publication_id": publication_id,
        "destination_id": destination_id,
        "idempotency_key": idempotency_key,
        "caption": text,
        "character_count": count,
        "hashtag_count": hashtag_count,
        "mention_count": mention_count,
        "media_count": len(items),
        "media_plan": media_plan,
        "readiness": {
            "status": "blocked" if diagnostics else "ready",
            "diagnostics": diagnostics,
        },
        "quota_check": {
            "method": f"GET /{account_id}/content_publishing_limit",
            "required_before_live_publish": True,
        },
        "container_plan": {
            "containers": containers,
            "status_poll": (
                {
                    "method": f"GET /{publish_container_id}",
                    "fields": ["status_code"],
                    "required_before_publish": True,
                }
                if publish_container_id
                else None
            ),
            "publish": (
                {
                    "method": f"POST /{account_id}/media_publish",
                    "body": {"creation_id": publish_container_id},
                    "idempotency_guard": "check_existing_external_post_before_publish",
                }
                if publish_container_id
                else None
            ),
        },
        "manual_package": {
            "caption": text,
            "media": media_plan,
            "instructions": [
                "Download or copy the prepared media package.",
                "Publish manually in Instagram until Meta readiness is approved.",
                "Confirm publication manually with external URL or post ID.",
            ],
        },
        "live_acceptance": "pending_meta_readiness",
    }


def validate_generic_webhook_url(endpoint_url: str) -> None:
    parsed = urlparse(endpoint_url)
    if parsed.scheme != "https":
        raise ConnectorValidationError(
            "webhook_https_required",
            "Generic webhook endpoints must use HTTPS.",
            {"endpoint_url": endpoint_url},
        )
    try:
        port = parsed.port
    except ValueError as exc:
        raise ConnectorValidationError(
            "webhook_port_forbidden",
            "Generic webhook endpoints must use HTTPS port 443.",
        ) from exc
    if port not in {None, 443}:
        raise ConnectorValidationError(
            "webhook_port_forbidden",
            "Generic webhook endpoints must use HTTPS port 443.",
            {"port": port},
        )
    if parsed.username or parsed.password:
        raise ConnectorValidationError(
            "webhook_credentials_in_url",
            "Generic webhook URL must not contain credentials.",
        )
    host = parsed.hostname
    if not host:
        raise ConnectorValidationError("webhook_host_required", "Generic webhook URL has no host.")
    normalized_host = host.rstrip(".").lower()
    blocked_hosts = {"localhost", "localhost.localdomain"}
    if normalized_host in blocked_hosts or normalized_host.endswith(".local"):
        raise ConnectorValidationError(
            "webhook_private_target",
            "Generic webhook cannot target local hostnames.",
            {"host": host},
        )
    try:
        ipaddress.ip_address(normalized_host)
    except ValueError:
        return
    raise ConnectorValidationError(
        "webhook_ip_literal_forbidden",
        "Generic webhook endpoints must use domain names, not IP literals.",
        {"host": host},
    )


def validate_destination_configuration(
    connector_key: str,
    configuration: dict[str, Any],
    *,
    can_activate_live: bool = False,
) -> None:
    if connector_key == TELEGRAM_CONNECTOR_KEY:
        _validate_telegram_destination_configuration(configuration)
        return
    if connector_key == MAX_CONNECTOR_KEY:
        _validate_max_destination_configuration(configuration)
        return
    if connector_key == INSTAGRAM_CONNECTOR_KEY:
        _validate_instagram_destination_configuration(configuration, can_activate_live=can_activate_live)
        return
    if connector_key == "generic_webhook":
        endpoint_url = str(configuration.get("endpoint_url") or "")
        validate_generic_webhook_url(endpoint_url)
        delivery_mode = str(configuration.get("delivery_mode") or "simulate")
        if delivery_mode == "live":
            raise ConnectorValidationError(
                "webhook_live_not_enabled",
                "General live webhook delivery is disabled until production controls are implemented and tested.",
            )
        if delivery_mode not in {"simulate", "allowlisted_live"}:
            raise ConnectorValidationError(
                "webhook_delivery_mode_invalid",
                "Generic webhook delivery mode must be simulate or allowlisted_live.",
                {"delivery_mode": delivery_mode},
            )
        if delivery_mode == "allowlisted_live":
            if not can_activate_live:
                raise ConnectorValidationError(
                    "webhook_live_requires_owner_admin",
                    "Only owner/admin may activate a live webhook.",
                )
            if configuration.get("endpoint_challenge_verified") is not True:
                raise ConnectorValidationError(
                    "webhook_challenge_required",
                    "Live webhook activation requires endpoint challenge verification.",
                )
            if not configuration.get("allowlist_id"):
                raise ConnectorValidationError(
                    "webhook_allowlist_required",
                    "Staging live webhook delivery requires an allowlist entry.",
                )


def redacted_destination_configuration(configuration: dict[str, Any]) -> dict[str, Any]:
    secret_keys = {
        "authorization",
        "authorization_header",
        "cookie",
        "cookies",
        "access_token",
        "refresh_token",
        "shared_secret",
        "webhook_secret",
        "secret",
        "token",
        "api_key",
        "app_secret",
        "bot_token",
        "client_secret",
        "instagram_access_token",
        "meta_access_token",
        "meta_app_secret",
        "telegram_bot_token",
        "password",
    }

    def redact(value: Any) -> Any:
        if isinstance(value, dict):
            return {
                key: "***redacted***" if str(key).lower() in secret_keys else redact(item)
                for key, item in value.items()
            }
        if isinstance(value, list):
            return [redact(item) for item in value]
        return value

    return redact(configuration)


def simulate_connector_publish(
    *,
    publication_id: str,
    destination_id: str,
    platform_key: str,
    connector_key: str,
    text: str,
    configuration: dict[str, Any],
    idempotency_key: str,
    media_items: list[dict[str, Any]] | None = None,
) -> ConnectorResult:
    if connector_key == TELEGRAM_CONNECTOR_KEY:
        validate_destination_configuration(connector_key, configuration, can_activate_live=True)
        payload_mode = _telegram_payload_mode(configuration)
        if payload_mode == "fallback_media_group":
            payload = build_telegram_fallback_payload(
                publication_id=publication_id,
                destination_id=destination_id,
                text=text,
                configuration=configuration,
                idempotency_key=idempotency_key,
                media_items=media_items,
            )
            return ConnectorResult(
                status="published",
                external_id=f"telegram:fallback:{destination_id}:{idempotency_key}",
                response_payload={
                    "provider": "telegram",
                    "delivery_mode": "simulate",
                    "payload": payload,
                    "message_ids": [
                        f"simulated-media-{index + 1}" for index in range(payload["media_count"])
                    ]
                    + ["simulated-text"],
                },
            )
        payload = build_telegram_rich_message_payload(
            publication_id=publication_id,
            destination_id=destination_id,
            text=text,
            configuration=configuration,
            idempotency_key=idempotency_key,
            media_items=media_items,
        )
        return ConnectorResult(
            status="published",
            external_id=f"telegram:rich:{destination_id}:{idempotency_key}",
            response_payload={
                "provider": "telegram",
                "delivery_mode": "simulate",
                "payload": payload,
                "message_id": f"simulated-rich-{idempotency_key}",
            },
        )
    if connector_key == MAX_CONNECTOR_KEY:
        validate_destination_configuration(connector_key, configuration, can_activate_live=True)
        payload = build_max_message_payload(
            publication_id=publication_id,
            destination_id=destination_id,
            text=text,
            configuration=configuration,
            idempotency_key=idempotency_key,
            media_items=media_items,
        )
        if configuration.get("simulate_attachment_not_ready") is True and payload["media_count"] > 0:
            return ConnectorResult(
                status="failed_retryable",
                external_id=None,
                response_payload={
                    "provider": "max",
                    "delivery_mode": "simulate",
                    "payload": payload,
                    "error": {"code": "attachment.not.ready"},
                    "retry_after_seconds": int(configuration.get("retry_after_seconds") or 30),
                },
                retryable=True,
                error_code="max_attachment_not_ready",
                error_message="MAX attachment is not ready yet.",
            )
        return ConnectorResult(
            status="published",
            external_id=f"max:message:{destination_id}:{idempotency_key}",
            response_payload={
                "provider": "max",
                "delivery_mode": "simulate",
                "payload": payload,
                "message": {"id": f"simulated-max-{idempotency_key}"},
            },
        )
    if connector_key == INSTAGRAM_CONNECTOR_KEY:
        validate_destination_configuration(connector_key, configuration, can_activate_live=True)
        try:
            payload = build_instagram_media_payload(
                publication_id=publication_id,
                destination_id=destination_id,
                text=text,
                configuration=configuration,
                idempotency_key=idempotency_key,
                media_items=media_items,
            )
        except ConnectorValidationError as exc:
            return ConnectorResult(
                status="failed_permanent",
                external_id=None,
                response_payload={
                    "provider": "instagram",
                    "delivery_mode": _instagram_delivery_mode(configuration),
                    "error": {
                        "code": exc.code,
                        "message": exc.message,
                        "details": exc.details,
                    },
                },
                error_code=exc.code,
                error_message=exc.message,
            )
        return ConnectorResult(
            status="manual_required",
            external_id=f"instagram:manual:{destination_id}:{idempotency_key}",
            response_payload={
                "provider": "instagram",
                "delivery_mode": _instagram_delivery_mode(configuration),
                "payload": payload,
                "message": "Instagram package requires manual publication until Meta readiness is approved.",
            },
        )
    if connector_key == "manual_export":
        return ConnectorResult(
            status="manual_required",
            external_id=f"manual-export:{publication_id}",
            response_payload={
                "package": {
                    "platform_key": platform_key,
                    "destination_id": destination_id,
                    "text": text,
                    "character_count": character_count(text),
                },
                "message": "Manual export package is ready.",
            },
        )
    if connector_key == "generic_webhook":
        validate_destination_configuration(connector_key, configuration, can_activate_live=True)
        status_code = int(configuration.get("simulate_status", 202))
        retry_after_seconds = configuration.get("retry_after_seconds")
        request = {
            "endpoint_url": configuration.get("endpoint_url"),
            "signature": "sha256=simulated",
            "idempotency_key": idempotency_key,
            "delivery_mode": configuration.get("delivery_mode") or "simulate",
            "payload": {
                "publication_id": publication_id,
                "destination_id": destination_id,
                "platform_key": platform_key,
                "text": text,
            },
        }
        if 200 <= status_code < 300:
            return ConnectorResult(
                status="published",
                external_id=f"webhook:{destination_id}:{idempotency_key}",
                response_payload={"status_code": status_code, "request": request},
            )
        retryable = status_code >= 500
        return ConnectorResult(
            status="failed_retryable" if retryable else "failed_permanent",
            external_id=None,
            response_payload={
                "status_code": status_code,
                "request": request,
                "retry_after_seconds": retry_after_seconds,
            },
            retryable=retryable,
            error_code="webhook_retryable_error" if retryable else "webhook_rejected",
            error_message=f"Generic webhook simulated HTTP {status_code}.",
        )
    return ConnectorResult(
        status="manual_required",
        external_id=f"prepared:{platform_key}:{publication_id}",
        response_payload={
            "message": "Native connector delivery is deferred; prepared variant requires manual handling.",
            "platform_key": platform_key,
            "connector_key": connector_key,
        },
    )


async def publish_connector(
    *,
    publication_id: str,
    destination_id: str,
    platform_key: str,
    connector_key: str,
    text: str,
    configuration: dict[str, Any],
    idempotency_key: str,
    media_items: list[dict[str, Any]] | None = None,
) -> ConnectorResult:
    if connector_key == TELEGRAM_CONNECTOR_KEY and _telegram_delivery_mode(configuration) == "live":
        return await _publish_telegram_live(
            publication_id=publication_id,
            destination_id=destination_id,
            text=text,
            configuration=configuration,
            idempotency_key=idempotency_key,
            media_items=media_items,
        )
    if connector_key == MAX_CONNECTOR_KEY and _max_delivery_mode(configuration) == "live":
        return await _publish_max_live(
            publication_id=publication_id,
            destination_id=destination_id,
            text=text,
            configuration=configuration,
            idempotency_key=idempotency_key,
            media_items=media_items,
        )
    return simulate_connector_publish(
        publication_id=publication_id,
        destination_id=destination_id,
        platform_key=platform_key,
        connector_key=connector_key,
        text=text,
        configuration=configuration,
        idempotency_key=idempotency_key,
        media_items=media_items,
    )


async def _publish_telegram_live(
    *,
    publication_id: str,
    destination_id: str,
    text: str,
    configuration: dict[str, Any],
    idempotency_key: str,
    media_items: list[dict[str, Any]] | None = None,
) -> ConnectorResult:
    validate_destination_configuration(TELEGRAM_CONNECTOR_KEY, configuration, can_activate_live=True)
    payload_mode = _telegram_payload_mode(configuration)
    if payload_mode != "rich_message":
        raise ConnectorValidationError(
            "telegram_live_fallback_not_enabled",
            "Telegram live fallback delivery is disabled until explicit live evidence is approved.",
        )
    payload = build_telegram_rich_message_payload(
        publication_id=publication_id,
        destination_id=destination_id,
        text=text,
        configuration=configuration,
        idempotency_key=idempotency_key,
        media_items=media_items,
    )
    token = str(configuration.get("bot_token") or "").strip()
    endpoint = f"https://api.telegram.org/bot{token}/sendRichMessage"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(endpoint, json=payload["request"])
    except httpx.HTTPError as exc:
        return ConnectorResult(
            status="failed_retryable",
            external_id=None,
            response_payload={
                "provider": "telegram",
                "delivery_mode": "live",
                "payload": payload,
                "transport_error": type(exc).__name__,
            },
            retryable=True,
            error_code="telegram_transport_error",
            error_message="Telegram Bot API request failed before a response was received.",
        )

    try:
        body = response.json()
    except ValueError:
        body = {"raw": response.text[:2048]}
    ok = bool(isinstance(body, dict) and body.get("ok") is True)
    if ok:
        result = body.get("result") if isinstance(body, dict) else {}
        message_id = str(result.get("message_id") if isinstance(result, dict) else response.status_code)
        return ConnectorResult(
            status="published",
            external_id=f"telegram:rich:{_target_chat(configuration)}:{message_id}",
            response_payload={
                "provider": "telegram",
                "delivery_mode": "live",
                "payload": payload,
                "telegram_result": result,
                "status_code": response.status_code,
            },
        )
    retry_after = None
    if isinstance(body, dict):
        parameters = body.get("parameters")
        if isinstance(parameters, dict):
            retry_after = parameters.get("retry_after")
    retryable = response.status_code == 429 or response.status_code >= 500
    return ConnectorResult(
        status="failed_retryable" if retryable else "failed_permanent",
        external_id=None,
        response_payload={
            "provider": "telegram",
            "delivery_mode": "live",
            "payload": payload,
            "status_code": response.status_code,
            "telegram_error": body,
            "retry_after_seconds": retry_after,
        },
        retryable=retryable,
        error_code="telegram_retryable_error" if retryable else "telegram_rejected",
        error_message="Telegram Bot API rejected the Rich Message publication.",
    )


async def _publish_max_live(
    *,
    publication_id: str,
    destination_id: str,
    text: str,
    configuration: dict[str, Any],
    idempotency_key: str,
    media_items: list[dict[str, Any]] | None = None,
) -> ConnectorResult:
    validate_destination_configuration(MAX_CONNECTOR_KEY, configuration, can_activate_live=True)
    payload = build_max_message_payload(
        publication_id=publication_id,
        destination_id=destination_id,
        text=text,
        configuration=configuration,
        idempotency_key=idempotency_key,
        media_items=media_items,
    )
    token = str(configuration.get("access_token") or "").strip()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://platform-api.max.ru/messages",
                params=payload["request"]["query"],
                headers={"Authorization": token, "Content-Type": "application/json"},
                json=payload["request"]["body"],
            )
    except httpx.HTTPError as exc:
        return ConnectorResult(
            status="failed_retryable",
            external_id=None,
            response_payload={
                "provider": "max",
                "delivery_mode": "live",
                "payload": payload,
                "transport_error": type(exc).__name__,
            },
            retryable=True,
            error_code="max_transport_error",
            error_message="MAX API request failed before a response was received.",
        )
    try:
        body = response.json()
    except ValueError:
        body = {"raw": response.text[:2048]}
    if 200 <= response.status_code < 300:
        message = body.get("message") if isinstance(body, dict) else {}
        message_id = str(message.get("id") if isinstance(message, dict) else response.status_code)
        return ConnectorResult(
            status="published",
            external_id=f"max:message:{_max_chat_id(configuration)}:{message_id}",
            response_payload={
                "provider": "max",
                "delivery_mode": "live",
                "payload": payload,
                "max_result": body,
                "status_code": response.status_code,
            },
        )
    error_code = None
    if isinstance(body, dict):
        error_code = str(body.get("code") or "")
    retryable = response.status_code == 429 or response.status_code >= 500 or error_code == "attachment.not.ready"
    return ConnectorResult(
        status="failed_retryable" if retryable else "failed_permanent",
        external_id=None,
        response_payload={
            "provider": "max",
            "delivery_mode": "live",
            "payload": payload,
            "status_code": response.status_code,
            "max_error": body,
            "retry_after_seconds": 30 if error_code == "attachment.not.ready" else None,
        },
        retryable=retryable,
        error_code="max_attachment_not_ready" if error_code == "attachment.not.ready" else "max_rejected",
        error_message="MAX API rejected the publication.",
    )
