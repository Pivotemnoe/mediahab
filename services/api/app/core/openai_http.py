from __future__ import annotations

import httpx

from app.core.config import Settings


def openai_async_client(settings: Settings, *, timeout: float) -> httpx.AsyncClient:
    """Build an OpenAI-only client without affecting S3 or social connector traffic."""
    kwargs: dict[str, object] = {"timeout": timeout}
    if settings.openai_proxy_url:
        kwargs["proxy"] = settings.openai_proxy_url
    return httpx.AsyncClient(**kwargs)
