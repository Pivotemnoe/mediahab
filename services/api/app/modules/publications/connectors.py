from __future__ import annotations

import html
import ipaddress
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
        connector_key="max_prepared",
        name="MAX подготовленный",
        hard_text_limit=4000,
        media_limit=None,
        publication_mode="native_prepared",
        automated_delivery=False,
        capabilities={
            "preview": True,
            "approval_required": True,
            "native_connector_phase": 8,
        },
        hard_limits={"text": 4000},
    ),
    "instagram": ConnectorCapability(
        platform_key="instagram",
        connector_key="instagram_prepared",
        name="Instagram подготовленный",
        hard_text_limit=2200,
        media_limit=10,
        publication_mode="native_prepared",
        automated_delivery=False,
        capabilities={
            "preview": True,
            "approval_required": True,
            "native_connector_phase": 9,
        },
        hard_limits={"caption": 2200, "carousel_min": 2, "carousel_max": 10},
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
                "message": "Instagram carousel requires 2-10 media items; single media needs a feed/Reels mode later.",
            }
        )
    if platform_key in {"max", "instagram"}:
        warnings.append(
            {
                "code": "native_connector_deferred",
                "message": "Native API delivery for this platform starts in a later phase.",
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
        "bot_token",
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
    if connector_key != TELEGRAM_CONNECTOR_KEY or _telegram_delivery_mode(configuration) != "live":
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

    validate_destination_configuration(connector_key, configuration, can_activate_live=True)
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
