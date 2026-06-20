from __future__ import annotations

import ipaddress
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse


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


CAPABILITIES: dict[str, ConnectorCapability] = {
    "telegram": ConnectorCapability(
        platform_key="telegram",
        connector_key="telegram_prepared",
        name="Telegram подготовленный",
        hard_text_limit=32768,
        media_limit=50,
        publication_mode="native_prepared",
        automated_delivery=False,
        capabilities={
            "preview": True,
            "approval_required": True,
            "native_connector_phase": 7,
        },
        hard_limits={"text": 32768, "media": 50, "rich_message": True},
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
    if platform_key in {"telegram", "max", "instagram"}:
        warnings.append(
            {
                "code": "native_connector_deferred",
                "message": "Native API delivery for this platform starts in a later phase.",
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


def validate_generic_webhook_url(endpoint_url: str) -> None:
    parsed = urlparse(endpoint_url)
    if parsed.scheme != "https":
        raise ConnectorValidationError(
            "webhook_https_required",
            "Generic webhook endpoints must use HTTPS.",
            {"endpoint_url": endpoint_url},
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
        ip = ipaddress.ip_address(normalized_host)
    except ValueError:
        return
    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        raise ConnectorValidationError(
            "webhook_private_target",
            "Generic webhook cannot target private or local network addresses.",
            {"host": host},
        )


def validate_destination_configuration(connector_key: str, configuration: dict[str, Any]) -> None:
    if connector_key == "generic_webhook":
        endpoint_url = str(configuration.get("endpoint_url") or "")
        validate_generic_webhook_url(endpoint_url)


def redacted_destination_configuration(configuration: dict[str, Any]) -> dict[str, Any]:
    redacted = dict(configuration)
    for key in ("shared_secret", "secret", "token", "api_key"):
        if key in redacted:
            redacted[key] = "***redacted***"
    return redacted


def simulate_connector_publish(
    *,
    publication_id: str,
    destination_id: str,
    platform_key: str,
    connector_key: str,
    text: str,
    configuration: dict[str, Any],
    idempotency_key: str,
) -> ConnectorResult:
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
        validate_destination_configuration(connector_key, configuration)
        status_code = int(configuration.get("simulate_status", 202))
        request = {
            "endpoint_url": configuration.get("endpoint_url"),
            "signature": "sha256=simulated",
            "idempotency_key": idempotency_key,
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
            response_payload={"status_code": status_code, "request": request},
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
