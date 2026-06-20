from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Protocol

import httpx

from app.core.config import Settings


class ProviderError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass
class StructuredGenerationRequest:
    task_type: str
    schema_name: str
    json_schema: dict[str, Any]
    system_prompt: str
    user_prompt: str
    fallback_payload: dict[str, Any]


@dataclass
class StructuredGenerationResult:
    provider_key: str
    model_id: str
    payload: dict[str, Any]
    usage: dict[str, Any]


@dataclass
class EmbeddingResult:
    provider_key: str
    model_id: str
    embeddings: list[list[float]]
    usage: dict[str, Any]


class TextGenerationProvider(Protocol):
    provider_key: str
    model_id: str

    async def generate_structured(
        self,
        request: StructuredGenerationRequest,
    ) -> StructuredGenerationResult: ...


class EmbeddingProvider(Protocol):
    provider_key: str
    model_id: str

    async def embed(self, texts: list[str]) -> EmbeddingResult: ...


class MockTextGenerationProvider:
    provider_key = "mock"

    def __init__(self, model_id: str) -> None:
        self.model_id = model_id

    async def generate_structured(
        self,
        request: StructuredGenerationRequest,
    ) -> StructuredGenerationResult:
        return StructuredGenerationResult(
            provider_key=self.provider_key,
            model_id=self.model_id,
            payload=request.fallback_payload,
            usage={
                "input_characters": len(request.system_prompt) + len(request.user_prompt),
                "output_characters": len(json.dumps(request.fallback_payload, ensure_ascii=False)),
            },
        )


class OpenAITextGenerationProvider:
    provider_key = "openai"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.model_id = settings.openai_text_model

    async def generate_structured(
        self,
        request: StructuredGenerationRequest,
    ) -> StructuredGenerationResult:
        if not self.settings.openai_api_key:
            raise ProviderError("openai_not_configured", "OPENAI_API_KEY is not configured.")
        payload = {
            "model": self.model_id,
            "instructions": request.system_prompt,
            "input": request.user_prompt,
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": request.schema_name,
                    "schema": request.json_schema,
                    "strict": True,
                }
            },
        }
        endpoint = f"{self.settings.openai_base_url.rstrip('/')}/responses"
        try:
            async with httpx.AsyncClient(timeout=self.settings.ai_text_timeout_seconds) as client:
                response = await client.post(
                    endpoint,
                    headers={"Authorization": f"Bearer {self.settings.openai_api_key}"},
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise ProviderError(
                "openai_request_failed",
                "OpenAI text generation request failed before a response was received.",
            ) from exc
        if response.status_code >= 400:
            raise ProviderError(
                "openai_request_failed",
                f"OpenAI text generation returned HTTP {response.status_code}.",
            )
        response_payload = response.json()
        parsed = extract_response_json(response_payload)
        if not isinstance(parsed, dict):
            raise ProviderError(
                "openai_invalid_response",
                "OpenAI text generation response did not contain a JSON object.",
            )
        return StructuredGenerationResult(
            provider_key=self.provider_key,
            model_id=self.model_id,
            payload=parsed,
            usage=response_payload.get("usage") or {},
        )


class ContractMockTextGenerationProvider(MockTextGenerationProvider):
    def __init__(self, provider_key: str) -> None:
        super().__init__(model_id=f"{provider_key}-contract-mock-v1")
        self.provider_key = provider_key


class MockEmbeddingProvider:
    provider_key = "mock"

    def __init__(self, model_id: str) -> None:
        self.model_id = model_id

    async def embed(self, texts: list[str]) -> EmbeddingResult:
        return EmbeddingResult(
            provider_key=self.provider_key,
            model_id=self.model_id,
            embeddings=[deterministic_embedding(text) for text in texts],
            usage={"input_characters": sum(len(text) for text in texts)},
        )


class OpenAIEmbeddingProvider:
    provider_key = "openai"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.model_id = settings.openai_embedding_model

    async def embed(self, texts: list[str]) -> EmbeddingResult:
        if not self.settings.openai_api_key:
            raise ProviderError("openai_not_configured", "OPENAI_API_KEY is not configured.")
        endpoint = f"{self.settings.openai_base_url.rstrip('/')}/embeddings"
        try:
            async with httpx.AsyncClient(timeout=self.settings.ai_text_timeout_seconds) as client:
                response = await client.post(
                    endpoint,
                    headers={"Authorization": f"Bearer {self.settings.openai_api_key}"},
                    json={"model": self.model_id, "input": texts},
                )
        except httpx.HTTPError as exc:
            raise ProviderError(
                "openai_request_failed",
                "OpenAI embedding request failed before a response was received.",
            ) from exc
        if response.status_code >= 400:
            raise ProviderError(
                "openai_request_failed",
                f"OpenAI embedding returned HTTP {response.status_code}.",
            )
        payload = response.json()
        data = payload.get("data")
        if not isinstance(data, list):
            raise ProviderError("openai_invalid_response", "OpenAI embedding response is invalid.")
        embeddings = [row.get("embedding") for row in sorted(data, key=lambda row: row.get("index", 0))]
        if not all(isinstance(vector, list) for vector in embeddings):
            raise ProviderError("openai_invalid_response", "OpenAI embedding vector is missing.")
        return EmbeddingResult(
            provider_key=self.provider_key,
            model_id=self.model_id,
            embeddings=embeddings,
            usage=payload.get("usage") or {},
        )


def text_provider_for(settings: Settings) -> TextGenerationProvider:
    provider_key = settings.ai_text_provider.strip().lower()
    if provider_key == "openai":
        return OpenAITextGenerationProvider(settings)
    if provider_key in {"yandexgpt", "gigachat"}:
        return ContractMockTextGenerationProvider(provider_key)
    return MockTextGenerationProvider(settings.ai_text_model)


def embedding_provider_for(settings: Settings) -> EmbeddingProvider:
    provider_key = settings.embedding_provider.strip().lower()
    if provider_key == "openai":
        return OpenAIEmbeddingProvider(settings)
    return MockEmbeddingProvider(settings.embedding_model)


def extract_response_json(payload: dict[str, Any]) -> Any:
    if "output_text" in payload:
        return parse_json_text(payload["output_text"])
    for item in payload.get("output", []) or []:
        for content in item.get("content", []) or []:
            if content.get("type") in {"output_text", "text"}:
                parsed = parse_json_text(content.get("text"))
                if parsed is not None:
                    return parsed
    return None


def parse_json_text(value: Any) -> Any:
    if isinstance(value, dict):
        return value
    if not isinstance(value, str):
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return None


def deterministic_embedding(text: str, dimensions: int = 16) -> list[float]:
    import hashlib
    import math
    import re

    vector = [0.0 for _ in range(dimensions)]
    for token in re.findall(r"[\wа-яё]+", text.lower()):
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = digest[0] % dimensions
        sign = 1.0 if digest[1] % 2 == 0 else -1.0
        vector[index] += sign * (1.0 + (len(token) % 5) / 10.0)
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [round(value / norm, 6) for value in vector]
