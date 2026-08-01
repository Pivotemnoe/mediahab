from __future__ import annotations

from typing import Any


FOOTER_TEMPLATE_KEY = "footer_template"


def _template(config: object, key: str) -> str:
    if not isinstance(config, dict):
        return ""
    value = config.get(key)
    return value.strip() if isinstance(value, str) else ""


def project_footer(config: object) -> str:
    return _template(config, FOOTER_TEMPLATE_KEY)


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
