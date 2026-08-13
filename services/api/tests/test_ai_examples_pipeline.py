from __future__ import annotations

import asyncio
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import Settings, get_settings  # noqa: E402
from app.db.base import (  # noqa: E402
    Base,
    ContentItem,
    ContentRevision,
    ExampleEmbedding,
    GenerationRun,
    GenerationStep,
)
from app.db.session import get_session  # noqa: E402
from app.main import create_app  # noqa: E402
from app.modules.ai.providers import ProviderError, StructuredGenerationResult  # noqa: E402


class Phase05AiExamplesPipelineTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        db_path = Path(self.tmpdir.name) / "phase05-test.sqlite"
        self.engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
        self.SessionLocal = async_sessionmaker(self.engine, expire_on_commit=False)
        asyncio.run(self._create_schema())
        self.app = create_app()

        async def override_session():
            async with self.SessionLocal() as session:
                yield session

        self.app.dependency_overrides[get_session] = override_session
        self.app.dependency_overrides[get_settings] = lambda: Settings(
            ai_text_provider="mock",
            embedding_provider="mock",
        )
        self.client = TestClient(self.app, base_url="https://testserver")

    def tearDown(self) -> None:
        self.client.close()
        asyncio.run(self.engine.dispose())
        self.tmpdir.cleanup()

    async def _create_schema(self) -> None:
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    def register(
        self,
        client: TestClient,
        email: str = "owner05@example.com",
        workspace_name: str = "Owner Workspace",
    ) -> dict[str, object]:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "strong-password-123",
                "display_name": "Test Owner",
                "workspace_name": workspace_name,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def csrf_headers(self, payload: dict[str, object]) -> dict[str, str]:
        return {"X-CSRF-Token": str(payload["csrf_token"])}

    def import_food_project(self, auth: dict[str, object]) -> tuple[dict[str, object], dict[str, object]]:
        workspace_id = auth["workspace"]["id"]
        imported = self.client.post(
            f"/api/v1/workspaces/{workspace_id}/projects/from-preset",
            headers=self.csrf_headers(auth),
            json={"preset_key": "chto-poest-armavir"},
        )
        self.assertEqual(imported.status_code, 200, imported.text)
        project = imported.json()["project"]
        rubrics = self.client.get(f"/api/v1/projects/{project['id']}/rubrics")
        self.assertEqual(rubrics.status_code, 200, rubrics.text)
        obzor = next(rubric for rubric in rubrics.json()["rubrics"] if rubric["slug"] == "obzor-nedeli")
        return project, obzor

    def create_content(self, auth: dict[str, object]) -> tuple[dict[str, object], dict[str, object], dict[str, object]]:
        project, rubric = self.import_food_project(auth)
        created = self.client.post(
            f"/api/v1/projects/{project['id']}/content-items",
            headers=self.csrf_headers(auth),
            json={"rubric_id": rubric["id"], "title_internal": "ПуриПури, тест AI"},
        )
        self.assertEqual(created.status_code, 200, created.text)
        return project, rubric, created.json()

    def import_examples(
        self,
        auth: dict[str, object],
        project_id: str,
        rubric_id: str,
        count: int = 9,
    ) -> list[dict[str, object]]:
        examples = [
            {
                "title": f"Пример {index}",
                "rubric_id": rubric_id,
                "source_type": "manual",
                "manual_quality_score": 8,
                "labels": ["еда", "обзор"],
                "text": (
                    f"Пример обзора {index}. Атмосфера описана спокойно, блюда разобраны "
                    "по вкусу, цене и ощущению. Есть честный вывод и вопрос аудитории."
                ),
                "metrics": {"views": 1000 + index, "reactions": 40 + index, "comments": 3},
            }
            for index in range(count)
        ]
        response = self.client.post(
            f"/api/v1/projects/{project_id}/examples/import",
            headers=self.csrf_headers(auth),
            json={"approve_immediately": True, "examples": examples},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["imported"]

    def seed_content_blocks(self, auth: dict[str, object], content: dict[str, object]) -> None:
        venue = self.client.put(
            f"/api/v1/content-items/{content['id']}/blocks/venue_name",
            headers=self.csrf_headers(auth),
            json={"value": {"text": "ПуриПури"}, "lock": True, "version": content["version"]},
        )
        self.assertEqual(venue.status_code, 200, venue.text)
        current = self.client.get(f"/api/v1/content-items/{content['id']}").json()
        atmosphere = self.client.put(
            f"/api/v1/content-items/{content['id']}/blocks/atmosphere",
            headers=self.csrf_headers(auth),
            json={
                "value": {"text": "Красивый зал, но сервис сыроват и хинкали принесли поздно."},
                "version": current["version"],
            },
        )
        self.assertEqual(atmosphere.status_code, 200, atmosphere.text)
        current = self.client.get(f"/api/v1/content-items/{content['id']}").json()
        dish = self.client.post(
            f"/api/v1/content-items/{content['id']}/repeatable-groups/dishes",
            headers=self.csrf_headers(auth),
            json={
                "version": current["version"],
                "lock": True,
                "values": {
                    "name": {"text": "Хинкали со свининой и говядиной"},
                    "price": {"amount": 590, "currency": "RUB"},
                    "observations": {"text": "Много сока, но вкус аджики перебивает мясо."},
                },
            },
        )
        self.assertEqual(dish.status_code, 200, dish.text)
        current = self.client.get(f"/api/v1/content-items/{content['id']}").json()
        ratings = self.client.put(
            f"/api/v1/content-items/{content['id']}/blocks/ratings",
            headers=self.csrf_headers(auth),
            json={
                "version": current["version"],
                "value": {
                    "taste": 4,
                    "impression": 2,
                    "fatness": 5,
                    "spiciness": 7,
                },
            },
        )
        self.assertEqual(ratings.status_code, 200, ratings.text)

    async def _embedding_count(self) -> int:
        async with self.SessionLocal() as session:
            rows = (await session.scalars(select(ExampleEmbedding))).all()
            return len(rows)

    async def _content_and_run(self, content_id: str, run_id: str) -> tuple[ContentItem, GenerationRun]:
        async with self.SessionLocal() as session:
            content = await session.get(ContentItem, UUID(content_id))
            run = await session.get(GenerationRun, UUID(run_id))
            assert content is not None
            assert run is not None
            return content, run

    async def _master_revision_text(self, revision_id: str) -> str:
        async with self.SessionLocal() as session:
            revision = await session.get(ContentRevision, UUID(revision_id))
            assert revision is not None
            return revision.text

    async def _generation_attempts(self, run_id: str) -> list[int]:
        async with self.SessionLocal() as session:
            rows = list(
                (
                    await session.scalars(
                        select(GenerationStep).where(
                            GenerationStep.generation_run_id == UUID(run_id),
                            GenerationStep.step_type == "generation",
                        )
                    )
                ).all()
            )
            return [
                int((row.input_metadata_json or {}).get("attempt", 0))
                for row in rows
            ]

    def test_examples_retrieval_and_master_generation(self) -> None:
        auth = self.register(self.client)
        project, rubric, content = self.create_content(auth)
        imported = self.import_examples(auth, project["id"], rubric["id"], count=9)
        self.assertEqual(len(imported), 9)
        self.assertEqual(asyncio.run(self._embedding_count()), 9)
        duplicate = self.client.post(
            f"/api/v1/projects/{project['id']}/examples/import",
            headers=self.csrf_headers(auth),
            json={"examples": [{"text": imported[0]["text"], "rubric_id": rubric["id"]}]},
        )
        self.assertEqual(duplicate.status_code, 200, duplicate.text)
        self.assertEqual(len(duplicate.json()["duplicates"]), 1)
        self.seed_content_blocks(auth, content)

        generated = self.client.post(
            f"/api/v1/content-items/{content['id']}/assemble-master",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(generated.status_code, 202, generated.text)
        body = generated.json()
        self.assertEqual(body["status"], "completed")
        self.assertEqual(body["task_type"], "assemble_master")
        self.assertGreaterEqual(len(body["retrieved_example_ids"]), 3)
        self.assertLessEqual(len(body["retrieved_example_ids"]), 8)
        response = body["response_json"]
        self.assertEqual(len(response["hook_candidates"]), 3)
        self.assertEqual(response["ratings_suggestion"]["taste"]["source"], "user")
        self.assertEqual(response["ratings_suggestion"]["taste"]["value"], 4)
        self.assertIn("revision_id", response)
        content_row, run_row = asyncio.run(self._content_and_run(content["id"], body["id"]))
        self.assertIsNotNone(content_row.current_master_revision_id)
        self.assertEqual(run_row.provider_key, "mock")

    def test_project_wide_examples_apply_without_rubric_assignment(self) -> None:
        auth = self.register(self.client, email="project-wide05@example.com")
        project, rubric, content = self.create_content(auth)
        examples = [
            {
                "title": f"Общий пример {index}",
                "source_type": "manual",
                "manual_quality_score": 9,
                "text": (
                    f"Общий удачный пост {index}. Живой ритм, конкретные наблюдения, "
                    "честный вывод и спокойный вопрос читателю без выдуманных фактов."
                ),
            }
            for index in range(10)
        ]
        imported = self.client.post(
            f"/api/v1/projects/{project['id']}/examples/import",
            headers=self.csrf_headers(auth),
            json={"approve_immediately": True, "examples": examples},
        )
        self.assertEqual(imported.status_code, 200, imported.text)
        imported_rows = imported.json()["imported"]
        self.assertEqual(len(imported_rows), 10)
        self.assertTrue(all(row["rubric_id"] is None for row in imported_rows))
        self.seed_content_blocks(auth, content)

        generated = self.client.post(
            f"/api/v1/content-items/{content['id']}/assemble-master",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(generated.status_code, 202, generated.text)
        retrieved = set(generated.json()["retrieved_example_ids"])
        imported_ids = {row["id"] for row in imported_rows}
        self.assertGreaterEqual(len(retrieved), 3)
        self.assertTrue(retrieved.issubset(imported_ids))
        self.assertEqual(rubric["id"], content["rubric_id"])

    def test_variant_refinement_creates_revision_and_failure_preserves_it(self) -> None:
        auth = self.register(self.client, email="refine05@example.com")
        _, _, content = self.create_content(auth)
        self.seed_content_blocks(auth, content)
        generated = self.client.post(
            f"/api/v1/content-items/{content['id']}/assemble-master",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(generated.status_code, 202, generated.text)
        variants = self.client.post(
            f"/api/v1/content-items/{content['id']}/generate-variants",
            headers=self.csrf_headers(auth),
            json={"platform_keys": ["telegram"]},
        )
        self.assertEqual(variants.status_code, 200, variants.text)
        original = variants.json()["variants"][0]

        refined = self.client.post(
            f"/api/v1/platform-variants/{original['id']}/refine",
            headers=self.csrf_headers(auth),
            json={"instruction": "Сделай текст живее, не меняя факты."},
        )
        self.assertEqual(refined.status_code, 200, refined.text)
        refined_body = refined.json()
        self.assertEqual(refined_body["variant"]["revision_number"], 2)
        self.assertEqual(refined_body["variant"]["parent_variant_id"], original["id"])
        self.assertEqual(refined_body["model_id"], "mock-editor-v1")
        self.assertIsNone(refined_body["input_tokens"])
        self.assertIsNone(refined_body["output_tokens"])
        self.assertGreater(refined_body["input_characters"], 0)
        self.assertGreater(refined_body["output_characters"], 0)

        self.app.dependency_overrides[get_settings] = lambda: Settings(
            ai_text_provider="openai",
            embedding_provider="mock",
            openai_api_key="test-only",
        )
        with patch(
            "app.modules.ai.providers.OpenAITextGenerationProvider.generate_structured",
            side_effect=ProviderError("openai_request_failed", "timeout"),
        ):
            failed = self.client.post(
                f"/api/v1/platform-variants/{refined_body['variant']['id']}/refine",
                headers=self.csrf_headers(auth),
                json={"instruction": "Пересобери текст."},
            )
        self.assertEqual(failed.status_code, 503, failed.text)

        history = self.client.get(f"/api/v1/content-items/{content['id']}/variants")
        self.assertEqual(history.status_code, 200, history.text)
        telegram_revisions = [
            row for row in history.json()["variants"] if row["platform_key"] == "telegram"
        ]
        self.assertEqual(len(telegram_revisions), 2)
        active = next(row for row in telegram_revisions if row["revision_number"] == 2)
        self.assertIsNone(active["superseded_by_variant_id"])

    def test_locked_fact_conflict_uses_source_fallback_master_revision(self) -> None:
        auth = self.register(self.client, email="conflict05@example.com", workspace_name="Conflict Workspace")
        project, rubric, content = self.create_content(auth)
        self.import_examples(auth, project["id"], rubric["id"], count=3)
        self.seed_content_blocks(auth, content)

        class ConflictProvider:
            provider_key = "mock"
            model_id = "conflict-test"

            async def generate_structured(self, request):
                payload = dict(request.fallback_payload)
                payload["fact_usage_map"] = [
                    {
                        "fact_key": "venue_name",
                        "generated_value_json": '{"text":"Другое место"}',
                        "source": "locked_fact",
                    }
                ]
                return StructuredGenerationResult(
                    provider_key=self.provider_key,
                    model_id=self.model_id,
                    payload=payload,
                    usage={},
                )

        with patch("app.modules.ai.service.text_provider_for", return_value=ConflictProvider()):
            generated = self.client.post(
                f"/api/v1/content-items/{content['id']}/assemble-master",
                headers=self.csrf_headers(auth),
            )
        self.assertEqual(generated.status_code, 202, generated.text)
        body = generated.json()
        self.assertEqual(body["status"], "completed")
        self.assertIsNone(body["error_code"])
        response = body["response_json"]
        self.assertEqual(response["quality"]["errors"], [])
        warnings = response["quality"]["warnings"]
        self.assertEqual(warnings[0]["code"], "ai_fact_conflict_fallback")
        usage_by_key = {item["fact_key"]: item for item in response["fact_usage_map"]}
        self.assertEqual(usage_by_key["venue_name"]["generated_value_json"], '{"text": "ПуриПури"}')
        self.assertIn("ПуриПури", response["master_text"])
        content_row, _ = asyncio.run(self._content_and_run(content["id"], body["id"]))
        self.assertIsNotNone(content_row.current_master_revision_id)

    def test_fact_extraction_uses_openai_safe_schema_and_normalizes_response(self) -> None:
        auth = self.register(self.client, email="facts05@example.com", workspace_name="Facts Workspace")
        _, _, content = self.create_content(auth)
        self.seed_content_blocks(auth, content)

        class FactProvider:
            provider_key = "openai"
            model_id = "facts-schema-test"

            def __init__(self) -> None:
                self.schema: dict[str, object] | None = None

            async def generate_structured(self, request):
                self.schema = request.json_schema
                return StructuredGenerationResult(
                    provider_key=self.provider_key,
                    model_id=self.model_id,
                    payload={
                        "facts": [
                            {
                                "fact_key": "venue_name",
                                "value_json": '{"text": "ПуриПури"}',
                                "source": "source_block",
                            },
                            {
                                "fact_key": "atmosphere",
                                "value_json": '{"text": "Красивый зал, но сервис сыроват."}',
                                "source": "source_block",
                            },
                        ],
                        "uncertainties": [],
                        "warnings": [],
                    },
                    usage={"input_tokens": 12, "output_tokens": 8},
                )

        provider = FactProvider()
        with patch("app.modules.ai.service.text_provider_for", return_value=provider):
            generated = self.client.post(
                f"/api/v1/content-items/{content['id']}/extract-facts",
                headers=self.csrf_headers(auth),
            )
        self.assertEqual(generated.status_code, 202, generated.text)
        self.assertIsNotNone(provider.schema)
        self.assertEqual(provider.schema["properties"]["facts"]["type"], "array")  # type: ignore[index]
        body = generated.json()
        self.assertEqual(body["status"], "completed")
        facts = body["response_json"]["facts"]
        self.assertEqual(facts["venue_name"]["text"], "ПуриПури")
        self.assertEqual(facts["atmosphere"]["text"], "Красивый зал, но сервис сыроват.")

    def test_master_generation_provider_failure_creates_source_fallback_revision(self) -> None:
        auth = self.register(self.client, email="fallback05@example.com", workspace_name="Fallback Workspace")
        project, rubric, content = self.create_content(auth)
        self.import_examples(auth, project["id"], rubric["id"], count=3)
        self.seed_content_blocks(auth, content)

        class FailingProvider:
            provider_key = "openai"
            model_id = "failing-openai-test"

            async def generate_structured(self, request):
                raise ProviderError("openai_request_failed", "OpenAI text generation returned HTTP 400.")

        with patch("app.modules.ai.service.text_provider_for", return_value=FailingProvider()):
            generated = self.client.post(
                f"/api/v1/content-items/{content['id']}/assemble-master",
                headers=self.csrf_headers(auth),
            )
        self.assertEqual(generated.status_code, 202, generated.text)
        body = generated.json()
        self.assertEqual(body["status"], "completed")
        self.assertIsNone(body["error_code"])
        response = body["response_json"]
        self.assertIn("revision_id", response)
        self.assertIn("ПуриПури", response["master_text"])
        warnings = response["quality"]["warnings"]
        self.assertEqual(warnings[0]["code"], "ai_provider_fallback")
        content_row, run_row = asyncio.run(self._content_and_run(content["id"], body["id"]))
        self.assertIsNotNone(content_row.current_master_revision_id)
        self.assertEqual(run_row.provider_key, "openai")

    def test_repeat_master_failure_preserves_last_good_revision(self) -> None:
        auth = self.register(
            self.client,
            email="preserve05@example.com",
            workspace_name="Preserve Workspace",
        )
        _, _, content = self.create_content(auth)
        self.seed_content_blocks(auth, content)
        first = self.client.post(
            f"/api/v1/content-items/{content['id']}/assemble-master",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(first.status_code, 202, first.text)
        first_revision_id = first.json()["response_json"]["revision_id"]

        class FailingProvider:
            provider_key = "openai"
            model_id = "failing-openai-test"

            async def generate_structured(self, request):
                raise ProviderError("openai_request_failed", "timeout")

        with patch("app.modules.ai.service.text_provider_for", return_value=FailingProvider()):
            repeated = self.client.post(
                f"/api/v1/content-items/{content['id']}/assemble-master",
                headers=self.csrf_headers(auth),
            )
        self.assertEqual(repeated.status_code, 202, repeated.text)
        repeated_body = repeated.json()
        self.assertEqual(repeated_body["status"], "failed")
        self.assertEqual(
            repeated_body["response_json"]["warnings"][0]["code"],
            "last_good_master_preserved",
        )
        content_row, _ = asyncio.run(
            self._content_and_run(content["id"], repeated_body["id"])
        )
        self.assertEqual(str(content_row.current_master_revision_id), first_revision_id)

    def test_custom_provider_master_normalizes_whitespace_before_revision(self) -> None:
        auth = self.register(
            self.client,
            email="hygiene-space05@example.com",
            workspace_name="Hygiene Space Workspace",
        )
        _, _, content = self.create_content(auth)
        self.seed_content_blocks(auth, content)

        class DirtyWhitespaceProvider:
            provider_key = "custom"
            model_id = "dirty-whitespace-test"

            def __init__(self) -> None:
                self.calls = 0
                self.clean_text = ""

            async def generate_structured(self, request):
                self.calls += 1
                payload = dict(request.fallback_payload)
                self.clean_text = str(payload["master_text"]).replace("\n\n", " ")
                payload["master_text"] = (
                    f" \t{self.clean_text.replace(' ', '  \u00a0')}  \n\n\n"
                )
                return StructuredGenerationResult(
                    provider_key=self.provider_key,
                    model_id=self.model_id,
                    payload=payload,
                    usage={"input_tokens": 7, "output_tokens": 5},
                )

        provider = DirtyWhitespaceProvider()
        with patch("app.modules.ai.service.text_provider_for", return_value=provider):
            generated = self.client.post(
                f"/api/v1/content-items/{content['id']}/assemble-master",
                headers=self.csrf_headers(auth),
            )
        self.assertEqual(generated.status_code, 202, generated.text)
        body = generated.json()
        self.assertEqual(body["status"], "completed", body)
        self.assertEqual(provider.calls, 1)
        self.assertEqual(body["response_json"]["master_text"], provider.clean_text)
        revision_id = body["response_json"]["revision_id"]
        self.assertEqual(
            asyncio.run(self._master_revision_text(revision_id)),
            provider.clean_text,
        )

    def test_custom_provider_master_retries_invalid_dash_and_sums_usage(self) -> None:
        auth = self.register(
            self.client,
            email="hygiene-retry05@example.com",
            workspace_name="Hygiene Retry Workspace",
        )
        _, _, content = self.create_content(auth)
        self.seed_content_blocks(auth, content)

        class RetryProvider:
            provider_key = "custom"
            model_id = "hygiene-retry-test"

            def __init__(self) -> None:
                self.calls = 0
                self.clean_text = ""
                self.system_prompts: list[str] = []

            async def generate_structured(self, request):
                self.calls += 1
                self.system_prompts.append(request.system_prompt)
                payload = dict(request.fallback_payload)
                self.clean_text = str(payload["master_text"]).replace("\n\n", " ")
                payload["master_text"] = self.clean_text
                if self.calls == 1:
                    payload["master_text"] = f"{self.clean_text} -- лишняя вставка."
                return StructuredGenerationResult(
                    provider_key=self.provider_key,
                    model_id=self.model_id,
                    payload=payload,
                    usage={
                        "input_tokens": 10 + self.calls,
                        "output_tokens": 4 + self.calls,
                        "input_characters": 100 + self.calls,
                        "output_characters": 50 + self.calls,
                    },
                )

        provider = RetryProvider()
        with patch("app.modules.ai.service.text_provider_for", return_value=provider):
            generated = self.client.post(
                f"/api/v1/content-items/{content['id']}/assemble-master",
                headers=self.csrf_headers(auth),
            )
        self.assertEqual(generated.status_code, 202, generated.text)
        body = generated.json()
        self.assertEqual(body["status"], "completed", body)
        self.assertEqual(provider.calls, 2)
        self.assertIn("Предыдущий ответ не прошёл", provider.system_prompts[1])
        self.assertEqual(body["input_tokens"], 23)
        self.assertEqual(body["output_tokens"], 11)
        self.assertEqual(body["input_characters"], 203)
        self.assertEqual(body["output_characters"], 103)
        self.assertEqual(body["response_json"]["master_text"], provider.clean_text)
        revision_id = body["response_json"]["revision_id"]
        self.assertEqual(
            asyncio.run(self._master_revision_text(revision_id)),
            provider.clean_text,
        )

    def test_two_invalid_master_attempts_fail_without_creating_revision(self) -> None:
        auth = self.register(
            self.client,
            email="hygiene-fail05@example.com",
            workspace_name="Hygiene Failure Workspace",
        )
        _, _, content = self.create_content(auth)
        self.seed_content_blocks(auth, content)

        class AlwaysInvalidProvider:
            provider_key = "custom"
            model_id = "hygiene-failure-test"

            def __init__(self) -> None:
                self.calls = 0

            async def generate_structured(self, request):
                self.calls += 1
                payload = dict(request.fallback_payload)
                payload["master_text"] = (
                    f"{payload['master_text']} -- неестественная вставка."
                )
                return StructuredGenerationResult(
                    provider_key=self.provider_key,
                    model_id=self.model_id,
                    payload=payload,
                    usage={"input_tokens": 3, "output_tokens": 2},
                )

        provider = AlwaysInvalidProvider()
        with patch("app.modules.ai.service.text_provider_for", return_value=provider):
            generated = self.client.post(
                f"/api/v1/content-items/{content['id']}/assemble-master",
                headers=self.csrf_headers(auth),
            )
        self.assertEqual(generated.status_code, 202, generated.text)
        body = generated.json()
        self.assertEqual(provider.calls, 2)
        self.assertEqual(body["status"], "failed")
        self.assertEqual(body["error_code"], "generated_text_hygiene_failed")
        self.assertEqual(
            body["response_json"]["errors"][0]["code"],
            "generated_text_hygiene_failed",
        )
        self.assertEqual(body["input_tokens"], 6)
        self.assertEqual(body["output_tokens"], 4)
        content_row, _ = asyncio.run(
            self._content_and_run(content["id"], body["id"])
        )
        self.assertIsNone(content_row.current_master_revision_id)

    def test_two_invalid_refinement_attempts_preserve_previous_variant(self) -> None:
        auth = self.register(
            self.client,
            email="hygiene-refine05@example.com",
            workspace_name="Hygiene Refinement Workspace",
        )
        _, _, content = self.create_content(auth)
        self.seed_content_blocks(auth, content)
        generated = self.client.post(
            f"/api/v1/content-items/{content['id']}/assemble-master",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(generated.status_code, 202, generated.text)
        variants = self.client.post(
            f"/api/v1/content-items/{content['id']}/generate-variants",
            headers=self.csrf_headers(auth),
            json={"platform_keys": ["telegram"]},
        )
        self.assertEqual(variants.status_code, 200, variants.text)
        original = variants.json()["variants"][0]

        class AlwaysInvalidRefinementProvider:
            provider_key = "custom"
            model_id = "hygiene-refinement-failure-test"

            def __init__(self) -> None:
                self.calls = 0

            async def generate_structured(self, request):
                self.calls += 1
                return StructuredGenerationResult(
                    provider_key=self.provider_key,
                    model_id=self.model_id,
                    payload={
                        "text": "Новая версия -- с неестественным тире.",
                        "warnings": [],
                    },
                    usage={"input_tokens": 2, "output_tokens": 1},
                )

        provider = AlwaysInvalidRefinementProvider()
        with patch("app.modules.ai.service.text_provider_for", return_value=provider):
            failed = self.client.post(
                f"/api/v1/platform-variants/{original['id']}/refine",
                headers=self.csrf_headers(auth),
                json={"instruction": "Сделай текст живее."},
            )
        self.assertEqual(failed.status_code, 503, failed.text)
        self.assertEqual(provider.calls, 2)
        self.assertEqual(
            failed.json()["error"]["code"],
            "generated_text_hygiene_failed",
        )
        run_id = failed.json()["error"]["details"]["run_id"]
        self.assertEqual(asyncio.run(self._generation_attempts(run_id)), [1, 2])

        history = self.client.get(f"/api/v1/content-items/{content['id']}/variants")
        self.assertEqual(history.status_code, 200, history.text)
        telegram_revisions = [
            row for row in history.json()["variants"] if row["platform_key"] == "telegram"
        ]
        self.assertEqual(len(telegram_revisions), 1)
        self.assertEqual(telegram_revisions[0]["id"], original["id"])
        self.assertEqual(telegram_revisions[0]["text"], original["text"])
        self.assertIsNone(telegram_revisions[0]["superseded_by_variant_id"])

    def test_cross_workspace_ai_run_access_returns_404(self) -> None:
        owner_a = self.register(self.client, email="owner-a05@example.com", workspace_name="A Workspace")
        project, rubric, content = self.create_content(owner_a)
        self.import_examples(owner_a, project["id"], rubric["id"], count=3)
        self.seed_content_blocks(owner_a, content)
        generated = self.client.post(
            f"/api/v1/content-items/{content['id']}/suggest-hook",
            headers=self.csrf_headers(owner_a),
        )
        self.assertEqual(generated.status_code, 202, generated.text)
        other = TestClient(self.app, base_url="https://testserver")
        try:
            self.register(other, email="owner-b05@example.com", workspace_name="B Workspace")
            response = other.get(f"/api/v1/ai-runs/{generated.json()['id']}")
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.json()["error"]["code"], "ai_run_not_found")
        finally:
            other.close()


if __name__ == "__main__":
    unittest.main()
