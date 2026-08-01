from __future__ import annotations

from typing import Any

from app.modules.publications.rich_text import (
    RichTextValidationError,
    normalize_rich_text,
    plain_rich_text,
    rich_text_plain,
    trim_rich_text,
)


FOOTER_TEMPLATE_KEY = "footer_template"
FOOTER_RICH_TEXT_KEY = "footer_rich_text"


def _template(config: object, key: str) -> str:
    if not isinstance(config, dict):
        return ""
    value = config.get(key)
    return value.strip() if isinstance(value, str) else ""


def project_footer(config: object) -> str:
    return _template(config, FOOTER_TEMPLATE_KEY)


def project_footer_rich_text(config: object) -> dict[str, Any]:
    if isinstance(config, dict) and config.get(FOOTER_RICH_TEXT_KEY) is not None:
        return normalize_rich_text(config[FOOTER_RICH_TEXT_KEY])
    return plain_rich_text(project_footer(config))


def normalize_cta_config(config: object) -> dict[str, Any]:
    if not isinstance(config, dict):
        return {}
    normalized = dict(config)
    rich_value = normalized.get(FOOTER_RICH_TEXT_KEY)
    if rich_value is None:
        return normalized
    try:
        document = trim_rich_text(rich_value)
    except RichTextValidationError:
        raise
    normalized[FOOTER_RICH_TEXT_KEY] = document
    normalized[FOOTER_TEMPLATE_KEY] = rich_text_plain(document).strip()
    return normalized


def strip_project_boilerplate(text: str, config: object) -> str:
    footer = project_footer(config)
    body = text.strip()
    if footer and body.endswith(footer):
        body = body[: -len(footer)].rstrip()
    return body.strip()


def apply_project_boilerplate(text: str, config: object) -> str:
    footer = project_footer(config)
    body = strip_project_boilerplate(text, config)
    return "\n\n".join(part for part in (body, footer) if part)


def ai_cta_config(config: object) -> dict[str, Any]:
    if not isinstance(config, dict):
        return {}
    guidance = config.get("guidance")
    return {"guidance": guidance} if isinstance(guidance, str) and guidance.strip() else {}
