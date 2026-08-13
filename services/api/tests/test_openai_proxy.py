from __future__ import annotations

import asyncio
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from app.core.config import Settings  # noqa: E402
from app.modules.ai.providers import (  # noqa: E402
    OpenAIEmbeddingProvider,
    OpenAITextGenerationProvider,
    StructuredGenerationRequest,
)
from app.modules.content.service import transcribe_with_openai  # noqa: E402
from app.modules.content.service import ContentProviderError  # noqa: E402


class FakeResponse:
    def __init__(self, payload: dict[str, object], status_code: int = 200) -> None:
        self.payload = payload
        self.status_code = status_code

    def json(self) -> dict[str, object]:
        return self.payload


class FakeClient:
    def __init__(self, responses: list[FakeResponse]) -> None:
        self.responses = responses
        self.requests: list[tuple[str, dict[str, object]]] = []

    async def __aenter__(self) -> "FakeClient":
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def post(self, endpoint: str, **kwargs: object) -> FakeResponse:
        self.requests.append((endpoint, kwargs))
        return self.responses.pop(0)


class OpenAIProxyTest(unittest.TestCase):
    def setUp(self) -> None:
        self.proxy_url = "http://relay-user:relay-password@5.129.239.104:18080"
        self.settings = Settings(
            openai_api_key="test-openai-key",
            openai_proxy_url=self.proxy_url,
            openai_text_model="gpt-4.1-mini",
            openai_embedding_model="text-embedding-3-small",
            openai_stt_model="gpt-4o-mini-transcribe",
        )

    def test_text_and_embedding_clients_use_explicit_openai_proxy(self) -> None:
        fake = FakeClient(
            [
                FakeResponse({"output_text": '{"answer":"ok"}', "usage": {}}),
                FakeResponse({"data": [{"index": 0, "embedding": [0.1, 0.2]}], "usage": {}}),
            ]
        )
        request = StructuredGenerationRequest(
            task_type="test",
            schema_name="test_result",
            json_schema={
                "type": "object",
                "properties": {"answer": {"type": "string"}},
                "required": ["answer"],
                "additionalProperties": False,
            },
            system_prompt="Follow the schema.",
            user_prompt="Return ok.",
            fallback_payload={"answer": "fallback"},
        )

        with patch("app.core.openai_http.httpx.AsyncClient", return_value=fake) as client_factory:
            result = asyncio.run(OpenAITextGenerationProvider(self.settings).generate_structured(request))
            embedding = asyncio.run(OpenAIEmbeddingProvider(self.settings).embed(["test"]))

        self.assertEqual(result.payload, {"answer": "ok"})
        self.assertEqual(embedding.embeddings, [[0.1, 0.2]])
        self.assertEqual(client_factory.call_count, 2)
        for call in client_factory.call_args_list:
            self.assertEqual(call.kwargs["proxy"], self.proxy_url)
        self.assertNotIn(self.proxy_url, str(fake.requests))

    def test_transcription_client_uses_explicit_openai_proxy(self) -> None:
        fake = FakeClient([FakeResponse({"text": "Проверка через NL.", "usage": {}})])
        media = SimpleNamespace(storage_key="voice/test.webm", mime_type="audio/webm")

        with patch("app.core.openai_http.httpx.AsyncClient", return_value=fake) as client_factory:
            transcript, metadata = asyncio.run(
                transcribe_with_openai(self.settings, media, b"audio-bytes")
            )

        self.assertEqual(transcript, "Проверка через NL.")
        self.assertEqual(metadata["provider"], "openai")
        self.assertEqual(client_factory.call_args.kwargs["proxy"], self.proxy_url)
        self.assertNotIn(self.proxy_url, str(fake.requests))

    def test_empty_recording_never_calls_transcription_provider(self) -> None:
        media = SimpleNamespace(storage_key="voice/empty.webm", mime_type="audio/webm")

        with patch("app.core.openai_http.httpx.AsyncClient") as client_factory:
            with self.assertRaises(ContentProviderError) as raised:
                asyncio.run(transcribe_with_openai(self.settings, media, b""))

        self.assertEqual(raised.exception.code, "empty_audio")
        client_factory.assert_not_called()

    def test_transcription_http_error_is_redacted_for_product_ui(self) -> None:
        fake = FakeClient([FakeResponse({"error": "bad request"}, status_code=400)])
        media = SimpleNamespace(storage_key="voice/test.webm", mime_type="audio/webm")

        with patch("app.core.openai_http.httpx.AsyncClient", return_value=fake):
            with self.assertRaises(ContentProviderError) as raised:
                asyncio.run(transcribe_with_openai(self.settings, media, b"audio-bytes"))

        self.assertEqual(raised.exception.code, "transcription_temporarily_unavailable")
        self.assertNotIn("OpenAI", raised.exception.message)
        self.assertNotIn("HTTP", raised.exception.message)

    def test_text_provider_sends_bounded_image_content_without_logging_it(self) -> None:
        fake = FakeClient([FakeResponse({"output_text": '{"answer":"ok"}', "usage": {}})])
        request = StructuredGenerationRequest(
            task_type="extract_facts",
            schema_name="test_result",
            json_schema={
                "type": "object",
                "properties": {"answer": {"type": "string"}},
                "required": ["answer"],
                "additionalProperties": False,
            },
            system_prompt="Follow the schema.",
            user_prompt="Read the receipt.",
            fallback_payload={"answer": "fallback"},
            input_images=["data:image/jpeg;base64,aW1hZ2U="],
        )

        with patch("app.core.openai_http.httpx.AsyncClient", return_value=fake):
            asyncio.run(OpenAITextGenerationProvider(self.settings).generate_structured(request))

        body = fake.requests[0][1]["json"]
        self.assertIsInstance(body, dict)
        inputs = body["input"]
        self.assertEqual(inputs[0]["role"], "user")
        self.assertEqual(inputs[0]["content"][0], {"type": "input_text", "text": "Read the receipt."})
        self.assertEqual(inputs[0]["content"][1]["type"], "input_image")
        self.assertEqual(inputs[0]["content"][1]["detail"], "low")

    def test_direct_openai_client_remains_default_without_proxy_setting(self) -> None:
        settings = Settings(openai_api_key="test-openai-key", openai_proxy_url=None)
        fake = FakeClient([FakeResponse({"data": [{"index": 0, "embedding": [1.0]}]})])

        with patch("app.core.openai_http.httpx.AsyncClient", return_value=fake) as client_factory:
            asyncio.run(OpenAIEmbeddingProvider(settings).embed(["test"]))

        self.assertNotIn("proxy", client_factory.call_args.kwargs)


if __name__ == "__main__":
    unittest.main()
