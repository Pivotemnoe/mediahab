from __future__ import annotations

import asyncio
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import Settings, get_settings  # noqa: E402
from app.db.base import (  # noqa: E402
    Base,
    ContentBlock,
    ContentItem,
    ContentRevision,
    Entitlement,
    GenerationRun,
    GenerationStep,
    MediaAsset,
    Membership,
    NotebookNote,
    Project,
    Subscription,
    UsageEvent,
    utc_now,
)
from app.db.session import get_session  # noqa: E402
from app.main import create_app  # noqa: E402
from app.modules.ai.providers import (  # noqa: E402
    ProviderError,
    StructuredGenerationResult,
    text_provider_for,
)
from app.modules.ai.service import (  # noqa: E402
    STANDALONE_IDEA_TASK_TYPE,
    AiPipelineError,
    mock_standalone_ideas_payload,
    normalize_and_validate_standalone_ideas,
)
from app.modules.content.service import (  # noqa: E402
    ContentProviderError,
    fetch_s3_object_bytes,
)


class FixedStandaloneIdeaProvider:
    provider_key = "openai"
    model_id = "gpt-5.6-luna"

    def __init__(self) -> None:
        self.calls = 0
        self.requests = []

    async def generate_structured(self, request):
        self.calls += 1
        self.requests.append(request)
        return StructuredGenerationResult(
            provider_key=self.provider_key,
            model_id=self.model_id,
            payload=mock_standalone_ideas_payload(),
            usage={"input_tokens": 100, "output_tokens": 200},
        )


class InvalidThenSuccessProvider(FixedStandaloneIdeaProvider):
    async def generate_structured(self, request):
        result = await super().generate_structured(request)
        if self.calls == 1:
            result.payload["ideas"] = result.payload["ideas"][:4]
            result.usage = {"input_tokens": 100, "output_tokens": 200}
        else:
            result.usage = {"input_tokens": 300, "output_tokens": 400}
        return result


class AlwaysInvalidProvider(FixedStandaloneIdeaProvider):
    async def generate_structured(self, request):
        result = await super().generate_structured(request)
        result.payload["ideas"] = result.payload["ideas"][:4]
        return result


class FailingProvider:
    provider_key = "openai"
    model_id = "gpt-5.6-luna"

    def __init__(self) -> None:
        self.calls = 0

    async def generate_structured(self, request):
        self.calls += 1
        raise ProviderError("provider_down", "Idea provider is unavailable.")


class StandaloneIdeasTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        db_path = Path(self.tmpdir.name) / "standalone-ideas.sqlite"
        self.engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
        self.SessionLocal = async_sessionmaker(self.engine, expire_on_commit=False)
        asyncio.run(self._create_schema())
        self.app = create_app()

        async def override_session():
            async with self.SessionLocal() as session:
                yield session

        self.settings = Settings(
            ai_text_provider="mock",
            embedding_provider="mock",
            stt_provider="mock",
            idea_generator_enabled=False,
            idea_generator_workspace_allowlist_raw="",
            standalone_idea_generator_enabled=False,
            standalone_idea_generator_workspace_allowlist_raw="",
            idea_generator_daily_limit=20,
        )
        self.app.dependency_overrides[get_session] = override_session
        self.app.dependency_overrides[get_settings] = lambda: self.settings
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
        *,
        client: TestClient | None = None,
        email: str = "standalone-owner@example.com",
        workspace_name: str = "Standalone Workspace",
    ) -> dict[str, object]:
        target = client or self.client
        response = target.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "strong-password-123",
                "display_name": "Idea Owner",
                "workspace_name": workspace_name,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    @staticmethod
    def csrf(auth: dict[str, object]) -> dict[str, str]:
        return {"X-CSRF-Token": str(auth["csrf_token"])}

    def enable(self, auth: dict[str, object], *, daily_limit: int = 20) -> None:
        self.settings = Settings(
            ai_text_provider="mock",
            embedding_provider="mock",
            stt_provider="mock",
            idea_generator_enabled=False,
            idea_generator_workspace_allowlist_raw="",
            standalone_idea_generator_enabled=True,
            standalone_idea_generator_workspace_allowlist_raw=str(
                auth["workspace"]["id"]
            ),
            idea_generator_daily_limit=daily_limit,
        )

    def enable_openai_stt(
        self, auth: dict[str, object], *, daily_limit: int = 20
    ) -> None:
        self.enable(auth, daily_limit=daily_limit)
        self.settings.stt_provider = "openai"
        self.settings.openai_api_key = "test-openai-key"

    def generate(self, auth: dict[str, object], topic: str = "Тема для публикации"):
        workspace_id = auth["workspace"]["id"]
        return self.client.post(
            f"/api/v1/workspaces/{workspace_id}/ideas/generate",
            headers=self.csrf(auth),
            json={"topic": topic},
        )

    async def _counts(self, workspace_id: str) -> dict[str, int]:
        async with self.SessionLocal() as session:
            workspace = UUID(workspace_id)

            async def count(model) -> int:
                return int(
                    await session.scalar(
                        select(func.count())
                        .select_from(model)
                        .where(model.workspace_id == workspace)
                    )
                    or 0
                )

            return {
                "projects": await count(Project),
                "content": await count(ContentItem),
                "blocks": await count(ContentBlock),
                "revisions": await count(ContentRevision),
                "notes": await count(NotebookNote),
                "runs": await count(GenerationRun),
            }

    async def _run(self, run_id: str) -> GenerationRun:
        async with self.SessionLocal() as session:
            run = await session.get(GenerationRun, UUID(run_id))
            assert run is not None
            return run

    async def _generation_steps(self, run_id: str) -> list[GenerationStep]:
        async with self.SessionLocal() as session:
            return list(
                await session.scalars(
                    select(GenerationStep)
                    .where(GenerationStep.generation_run_id == UUID(run_id))
                    .order_by(GenerationStep.created_at)
                )
            )

    async def _usage_events(self, workspace_id: str, key: str) -> list[UsageEvent]:
        async with self.SessionLocal() as session:
            return list(
                await session.scalars(
                    select(UsageEvent).where(
                        UsageEvent.workspace_id == UUID(workspace_id),
                        UsageEvent.key == key,
                    )
                )
            )

    async def _set_subscription_status(self, workspace_id: str, status: str) -> None:
        async with self.SessionLocal() as session:
            subscription = await session.scalar(
                select(Subscription).where(
                    Subscription.workspace_id == UUID(workspace_id)
                )
            )
            assert subscription is not None
            subscription.status = status
            await session.commit()

    async def _set_entitlement(
        self,
        workspace_id: str,
        key: str,
        value: int,
    ) -> None:
        async with self.SessionLocal() as session:
            subscription = await session.scalar(
                select(Subscription).where(
                    Subscription.workspace_id == UUID(workspace_id)
                )
            )
            assert subscription is not None
            entitlement = await session.scalar(
                select(Entitlement).where(
                    Entitlement.plan_id == subscription.plan_id,
                    Entitlement.key == key,
                )
            )
            assert entitlement is not None
            entitlement.value_json = value
            await session.commit()

    async def _add_membership(
        self,
        workspace_id: str,
        user_id: str,
        role: str,
    ) -> None:
        async with self.SessionLocal() as session:
            now = utc_now()
            session.add(
                Membership(
                    workspace_id=UUID(workspace_id),
                    user_id=UUID(user_id),
                    role_key=role,
                    publication_permission="approval_required",
                    accepted_at=now,
                    created_at=now,
                    updated_at=now,
                    version=1,
                )
            )
            await session.commit()

    async def _create_voice_media(
        self,
        workspace_id: str,
        user_id: str,
        *,
        duration_ms: int | None = 42_000,
        size_bytes: int = 512,
    ) -> str:
        async with self.SessionLocal() as session:
            now = utc_now()
            media = MediaAsset(
                id=uuid4(),
                workspace_id=UUID(workspace_id),
                storage_key=f"tests/standalone-idea-{uuid4()}.webm",
                bucket="tests",
                kind="voice",
                mime_type="audio/webm",
                size_bytes=size_bytes,
                duration_ms=duration_ms,
                upload_status="uploaded",
                processing_status="ready",
                created_by=UUID(user_id),
                created_at=now,
                updated_at=now,
                version=1,
            )
            session.add(media)
            await session.commit()
            return str(media.id)

    async def _media(self, media_id: str) -> MediaAsset:
        async with self.SessionLocal() as session:
            media = await session.get(MediaAsset, UUID(media_id))
            assert media is not None
            return media

    async def _invalid_null_project_rejected(
        self,
        workspace_id: str,
        user_id: str,
    ) -> bool:
        async with self.SessionLocal() as session:
            now = utc_now()
            session.add(
                GenerationRun(
                    id=uuid4(),
                    workspace_id=UUID(workspace_id),
                    project_id=None,
                    rubric_id=None,
                    content_item_id=None,
                    task_type="assemble_master",
                    provider_key="mock",
                    model_id="mock-editor-v1",
                    status="running",
                    context_manifest_json={},
                    request_metadata_json={},
                    retrieved_example_ids=[],
                    retry_count=0,
                    created_by=UUID(user_id),
                    created_at=now,
                    updated_at=now,
                )
            )
            try:
                await session.flush()
            except IntegrityError:
                await session.rollback()
                return True
            return False

    def test_standalone_flag_is_independent_from_legacy_project_flag(self) -> None:
        auth = self.register()
        workspace_id = str(auth["workspace"]["id"])
        self.settings = Settings(
            ai_text_provider="mock",
            embedding_provider="mock",
            idea_generator_enabled=True,
            idea_generator_workspace_allowlist_raw=workspace_id,
            standalone_idea_generator_enabled=False,
            standalone_idea_generator_workspace_allowlist_raw="",
        )
        capability = self.client.get(
            f"/api/v1/workspaces/{workspace_id}/ideas/capability"
        )
        self.assertEqual(capability.status_code, 200, capability.text)
        self.assertFalse(capability.json()["enabled"])

        provider = FixedStandaloneIdeaProvider()
        with patch("app.modules.ai.service.text_provider_for", return_value=provider):
            blocked = self.generate(auth)
        self.assertEqual(blocked.status_code, 403, blocked.text)
        self.assertEqual(
            blocked.json()["error"]["code"],
            "standalone_idea_generator_unavailable",
        )
        self.assertEqual(provider.calls, 0)

    def test_workspace_without_project_receives_exactly_five_directions(self) -> None:
        auth = self.register(email="five@example.com")
        workspace_id = str(auth["workspace"]["id"])
        self.enable(auth)
        provider = FixedStandaloneIdeaProvider()
        topic = "Как владельцу кофейни рассказывать о команде"
        with patch("app.modules.ai.service.text_provider_for", return_value=provider):
            response = self.generate(auth, topic)
        self.assertEqual(response.status_code, 202, response.text)
        body = response.json()
        self.assertEqual(body["status"], "completed")
        self.assertIsNone(body["project_id"])
        self.assertIsNone(body["rubric_id"])
        self.assertIsNone(body["content_item_id"])
        self.assertEqual(len(body["response_json"]["ideas"]), 5)
        self.assertEqual(
            [idea["id"] for idea in body["response_json"]["ideas"]],
            [f"idea-{index}" for index in range(1, 6)],
        )
        self.assertTrue(
            all(
                set(idea) == {"id", "title", "direction", "speaking_prompt"}
                and idea["speaking_prompt"].endswith("?")
                for idea in body["response_json"]["ideas"]
            )
        )
        self.assertEqual(
            asyncio.run(self._counts(workspace_id)),
            {
                "projects": 0,
                "content": 0,
                "blocks": 0,
                "revisions": 0,
                "notes": 0,
                "runs": 1,
            },
        )
        run = asyncio.run(self._run(body["id"]))
        self.assertEqual(run.task_type, STANDALONE_IDEA_TASK_TYPE)
        self.assertEqual(run.retrieved_example_ids, [])
        self.assertEqual(run.context_manifest_json["scope"], "workspace")
        self.assertNotIn("project_version_id", run.context_manifest_json)
        self.assertNotIn("example_ids", run.context_manifest_json)
        self.assertTrue(
            asyncio.run(
                self._invalid_null_project_rejected(
                    workspace_id,
                    str(auth["user"]["id"]),
                )
            )
        )
        request_payload = json.loads(provider.requests[0].user_prompt)
        self.assertEqual(request_payload["topic_untrusted"], topic)
        self.assertIn("не отвечай", provider.requests[0].system_prompt.lower())

    def test_topic_contract_rejects_blank_and_chat_fields_before_provider(self) -> None:
        auth = self.register(email="contract@example.com")
        workspace_id = str(auth["workspace"]["id"])
        self.enable(auth)
        provider = FixedStandaloneIdeaProvider()
        with patch("app.modules.ai.service.text_provider_for", return_value=provider):
            blank = self.client.post(
                f"/api/v1/workspaces/{workspace_id}/ideas/generate",
                headers=self.csrf(auth),
                json={"topic": "   "},
            )
            chat = self.client.post(
                f"/api/v1/workspaces/{workspace_id}/ideas/generate",
                headers=self.csrf(auth),
                json={"topic": "Погода", "messages": [{"role": "user"}]},
            )
        self.assertEqual(blank.status_code, 422, blank.text)
        self.assertEqual(chat.status_code, 422, chat.text)
        self.assertEqual(provider.calls, 0)
        self.assertEqual(asyncio.run(self._counts(workspace_id))["runs"], 0)

    def test_unrelated_question_remains_a_one_shot_idea_request(self) -> None:
        auth = self.register(email="question@example.com")
        self.enable(auth)
        provider = FixedStandaloneIdeaProvider()
        with patch("app.modules.ai.service.text_provider_for", return_value=provider):
            response = self.generate(auth, "Какая сегодня погода?")
        self.assertEqual(response.status_code, 202, response.text)
        self.assertEqual(response.json()["status"], "completed")
        request = provider.requests[0]
        self.assertEqual(request.task_type, STANDALONE_IDEA_TASK_TYPE)
        self.assertEqual(request.json_schema["properties"]["ideas"]["minItems"], 5)
        self.assertNotIn("answer", request.json_schema["properties"])
        self.assertNotIn("messages", json.loads(request.user_prompt))

    def test_validation_retries_once_and_preserves_one_billing_event(self) -> None:
        auth = self.register(email="retry-validation@example.com")
        workspace_id = str(auth["workspace"]["id"])
        self.enable(auth)
        provider = InvalidThenSuccessProvider()
        with patch("app.modules.ai.service.text_provider_for", return_value=provider):
            response = self.generate(auth)
        self.assertEqual(response.status_code, 202, response.text)
        body = response.json()
        self.assertEqual(body["status"], "completed")
        self.assertEqual(provider.calls, 2)
        self.assertEqual(provider.requests[0].user_prompt, provider.requests[1].user_prompt)
        run = asyncio.run(self._run(body["id"]))
        self.assertEqual(run.input_tokens, 400)
        self.assertEqual(run.output_tokens, 600)
        steps = asyncio.run(self._generation_steps(body["id"]))
        self.assertEqual([step.status for step in steps], ["failed", "completed"])
        events = asyncio.run(
            self._usage_events(workspace_id, "ai.text_generations.monthly")
        )
        self.assertEqual(len(events), 1)
        self.assertEqual(str(events[0].id), body["id"])

    def test_failed_run_can_retry_without_project_and_bills_new_user_action(self) -> None:
        auth = self.register(email="explicit-retry@example.com")
        workspace_id = str(auth["workspace"]["id"])
        self.enable(auth)
        failing = FailingProvider()
        with patch("app.modules.ai.service.text_provider_for", return_value=failing):
            failed = self.generate(auth, "Новая тема")
        self.assertEqual(failed.status_code, 202, failed.text)
        failed_body = failed.json()
        self.assertEqual(failed_body["status"], "failed")
        self.assertEqual(failed_body["error_code"], "provider_down")
        self.assertEqual(failing.calls, 2)

        fixed = FixedStandaloneIdeaProvider()
        with patch("app.modules.ai.service.text_provider_for", return_value=fixed):
            retried = self.client.post(
                f"/api/v1/ai-runs/{failed_body['id']}/retry",
                headers=self.csrf(auth),
            )
        self.assertEqual(retried.status_code, 202, retried.text)
        retried_body = retried.json()
        self.assertEqual(retried_body["status"], "completed")
        self.assertEqual(retried_body["retry_count"], 1)
        self.assertIsNone(retried_body["project_id"])
        self.assertNotEqual(retried_body["id"], failed_body["id"])
        self.assertEqual(
            len(
                asyncio.run(
                    self._usage_events(workspace_id, "ai.text_generations.monthly")
                )
            ),
            2,
        )

        duplicate_provider = FixedStandaloneIdeaProvider()
        with patch(
            "app.modules.ai.service.text_provider_for",
            return_value=duplicate_provider,
        ):
            duplicate = self.client.post(
                f"/api/v1/ai-runs/{failed_body['id']}/retry",
                headers=self.csrf(auth),
            )
        self.assertEqual(duplicate.status_code, 202, duplicate.text)
        self.assertEqual(duplicate.json()["id"], retried_body["id"])
        self.assertEqual(duplicate_provider.calls, 0)
        self.assertEqual(
            len(
                asyncio.run(
                    self._usage_events(workspace_id, "ai.text_generations.monthly")
                )
            ),
            2,
        )

    def test_standalone_run_cannot_enter_legacy_acceptance(self) -> None:
        auth = self.register(email="legacy-accept@example.com")
        workspace_id = str(auth["workspace"]["id"])
        self.enable(auth)
        with patch(
            "app.modules.ai.service.text_provider_for",
            return_value=FixedStandaloneIdeaProvider(),
        ):
            generated = self.generate(auth)
        self.assertEqual(generated.status_code, 202, generated.text)
        accepted = self.client.post(
            f"/api/v1/ai-runs/{generated.json()['id']}/ideas/idea-1/accept",
            headers=self.csrf(auth),
            json={"client_content_id": str(uuid4())},
        )
        self.assertEqual(accepted.status_code, 409, accepted.text)
        self.assertEqual(accepted.json()["error"]["code"], "idea_run_not_acceptable")
        self.assertEqual(asyncio.run(self._counts(workspace_id))["content"], 0)

    def test_daily_limit_and_inactive_subscription_block_before_provider(self) -> None:
        auth = self.register(email="limits@example.com")
        workspace_id = str(auth["workspace"]["id"])
        self.enable(auth, daily_limit=1)
        first_provider = FixedStandaloneIdeaProvider()
        with patch("app.modules.ai.service.text_provider_for", return_value=first_provider):
            first = self.generate(auth)
        self.assertEqual(first.status_code, 202, first.text)

        blocked_provider = FixedStandaloneIdeaProvider()
        with patch("app.modules.ai.service.text_provider_for", return_value=blocked_provider):
            daily_blocked = self.generate(auth, "Другая тема")
        self.assertEqual(daily_blocked.status_code, 429, daily_blocked.text)
        self.assertEqual(
            daily_blocked.json()["error"]["code"], "idea_daily_limit_reached"
        )
        self.assertEqual(blocked_provider.calls, 0)
        daily_capability = self.client.get(
            f"/api/v1/workspaces/{workspace_id}/ideas/capability"
        )
        self.assertEqual(daily_capability.status_code, 200, daily_capability.text)
        self.assertFalse(daily_capability.json()["can_generate"])

        second = self.register(
            email="inactive@example.com", workspace_name="Inactive Workspace"
        )
        second_workspace = str(second["workspace"]["id"])
        self.enable(second)
        asyncio.run(self._set_subscription_status(second_workspace, "canceled"))
        inactive_provider = FixedStandaloneIdeaProvider()
        with patch("app.modules.ai.service.text_provider_for", return_value=inactive_provider):
            inactive = self.generate(second)
        self.assertEqual(inactive.status_code, 402, inactive.text)
        self.assertEqual(inactive.json()["error"]["code"], "subscription_inactive")
        self.assertEqual(inactive_provider.calls, 0)
        self.assertEqual(asyncio.run(self._counts(second_workspace))["runs"], 0)
        inactive_capability = self.client.get(
            f"/api/v1/workspaces/{second_workspace}/ideas/capability"
        )
        self.assertEqual(inactive_capability.status_code, 200, inactive_capability.text)
        self.assertFalse(inactive_capability.json()["can_generate"])

        monthly = self.register(
            email="monthly-limit@example.com", workspace_name="Monthly Workspace"
        )
        monthly_workspace = str(monthly["workspace"]["id"])
        self.enable(monthly)
        asyncio.run(
            self._set_entitlement(
                monthly_workspace,
                "ai.text_generations.monthly",
                1,
            )
        )
        with patch(
            "app.modules.ai.service.text_provider_for",
            return_value=FixedStandaloneIdeaProvider(),
        ):
            consumed = self.generate(monthly)
        self.assertEqual(consumed.status_code, 202, consumed.text)
        monthly_capability = self.client.get(
            f"/api/v1/workspaces/{monthly_workspace}/ideas/capability"
        )
        self.assertEqual(monthly_capability.status_code, 200, monthly_capability.text)
        self.assertFalse(monthly_capability.json()["can_generate"])

    def test_workspace_tenant_and_viewer_guards_run_before_provider(self) -> None:
        owner = self.register(email="tenant-owner@example.com")
        owner_workspace = str(owner["workspace"]["id"])
        self.enable(owner)
        viewer_client = TestClient(self.app, base_url="https://testserver")
        try:
            viewer = self.register(
                client=viewer_client,
                email="tenant-viewer@example.com",
                workspace_name="Viewer Workspace",
            )
            asyncio.run(
                self._add_membership(
                    owner_workspace,
                    str(viewer["user"]["id"]),
                    "viewer",
                )
            )
            provider = FixedStandaloneIdeaProvider()
            with patch("app.modules.ai.service.text_provider_for", return_value=provider):
                denied = viewer_client.post(
                    f"/api/v1/workspaces/{owner_workspace}/ideas/generate",
                    headers=self.csrf(viewer),
                    json={"topic": "Тема"},
                )
                hidden = viewer_client.post(
                    f"/api/v1/workspaces/{uuid4()}/ideas/generate",
                    headers=self.csrf(viewer),
                    json={"topic": "Тема"},
                )
            self.assertEqual(denied.status_code, 403, denied.text)
            self.assertEqual(denied.json()["error"]["code"], "role_denied")
            self.assertEqual(hidden.status_code, 404, hidden.text)
            self.assertEqual(hidden.json()["error"]["code"], "workspace_not_found")
            self.assertEqual(provider.calls, 0)
        finally:
            viewer_client.close()

    def test_transcribe_topic_uses_workspace_voice_without_creating_note(self) -> None:
        auth = self.register(email="voice-topic@example.com")
        workspace_id = str(auth["workspace"]["id"])
        self.enable(auth)
        media_id = asyncio.run(
            self._create_voice_media(workspace_id, str(auth["user"]["id"]))
        )
        response = self.client.post(
            f"/api/v1/workspaces/{workspace_id}/ideas/transcribe-topic",
            headers=self.csrf(auth),
            json={"media_id": media_id},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.json()["transcript_text"],
            "Тема для нового поста",
        )
        counts = asyncio.run(self._counts(workspace_id))
        self.assertEqual(counts["content"], 0)
        self.assertEqual(counts["notes"], 0)
        self.assertEqual(counts["runs"], 0)
        events = asyncio.run(
            self._usage_events(workspace_id, "ai.transcription_seconds.monthly")
        )
        self.assertEqual(len(events), 1)
        self.assertEqual(str(events[0].id), media_id)
        self.assertEqual(int(events[0].quantity), 42)
        media = asyncio.run(self._media(media_id))
        self.assertIsNotNone(media.retention_until)
        self.assertEqual(media.processing_status, "completed")

        injected = self.client.post(
            f"/api/v1/workspaces/{workspace_id}/ideas/transcribe-topic",
            headers=self.csrf(auth),
            json={"media_id": media_id, "mock_transcript": "Injected topic"},
        )
        self.assertEqual(injected.status_code, 422, injected.text)

    def test_transcribe_topic_is_one_provider_call_per_media(self) -> None:
        auth = self.register(email="voice-idempotent@example.com")
        workspace_id = str(auth["workspace"]["id"])
        self.enable_openai_stt(auth)
        media_id = asyncio.run(
            self._create_voice_media(workspace_id, str(auth["user"]["id"]))
        )
        with (
            patch(
                "app.api.v1.routes.ai.fetch_s3_object_bytes",
                return_value=b"voice",
            ) as fetch,
            patch(
                "app.api.v1.routes.ai.transcribe_with_openai",
                new_callable=AsyncMock,
                return_value=("Тема о рабочем процессе", {}),
            ) as transcribe,
        ):
            first = self.client.post(
                f"/api/v1/workspaces/{workspace_id}/ideas/transcribe-topic",
                headers=self.csrf(auth),
                json={"media_id": media_id},
            )
            repeated = self.client.post(
                f"/api/v1/workspaces/{workspace_id}/ideas/transcribe-topic",
                headers=self.csrf(auth),
                json={"media_id": media_id},
            )
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(repeated.status_code, 409, repeated.text)
        self.assertEqual(
            repeated.json()["error"]["code"],
            "standalone_idea_topic_already_transcribed",
        )
        self.assertEqual(fetch.call_count, 1)
        self.assertEqual(fetch.call_args.kwargs["max_bytes"], 25 * 1024 * 1024)
        self.assertEqual(transcribe.await_count, 1)
        events = asyncio.run(
            self._usage_events(workspace_id, "ai.transcription_seconds.monthly")
        )
        self.assertEqual(len(events), 1)

    def test_transcribe_topic_validates_media_and_quota_before_provider(self) -> None:
        auth = self.register(email="voice-guards@example.com")
        workspace_id = str(auth["workspace"]["id"])
        self.enable_openai_stt(auth)
        missing_duration = asyncio.run(
            self._create_voice_media(
                workspace_id,
                str(auth["user"]["id"]),
                duration_ms=None,
            )
        )
        oversized = asyncio.run(
            self._create_voice_media(
                workspace_id,
                str(auth["user"]["id"]),
                size_bytes=25 * 1024 * 1024 + 1,
            )
        )
        inactive = asyncio.run(
            self._create_voice_media(workspace_id, str(auth["user"]["id"]))
        )
        with (
            patch("app.api.v1.routes.ai.fetch_s3_object_bytes") as fetch,
            patch(
                "app.api.v1.routes.ai.transcribe_with_openai",
                new_callable=AsyncMock,
            ) as transcribe,
        ):
            missing = self.client.post(
                f"/api/v1/workspaces/{workspace_id}/ideas/transcribe-topic",
                headers=self.csrf(auth),
                json={"media_id": missing_duration},
            )
            too_large = self.client.post(
                f"/api/v1/workspaces/{workspace_id}/ideas/transcribe-topic",
                headers=self.csrf(auth),
                json={"media_id": oversized},
            )
            asyncio.run(self._set_subscription_status(workspace_id, "canceled"))
            no_subscription = self.client.post(
                f"/api/v1/workspaces/{workspace_id}/ideas/transcribe-topic",
                headers=self.csrf(auth),
                json={"media_id": inactive},
            )
        self.assertEqual(missing.status_code, 422, missing.text)
        self.assertEqual(
            missing.json()["error"]["code"],
            "idea_topic_audio_duration_invalid",
        )
        self.assertEqual(too_large.status_code, 422, too_large.text)
        self.assertEqual(
            too_large.json()["error"]["code"],
            "idea_topic_audio_size_invalid",
        )
        self.assertEqual(no_subscription.status_code, 402, no_subscription.text)
        self.assertEqual(
            no_subscription.json()["error"]["code"], "subscription_inactive"
        )
        self.assertEqual(fetch.call_count, 0)
        self.assertEqual(transcribe.await_count, 0)

        asyncio.run(self._set_subscription_status(workspace_id, "active"))
        asyncio.run(
            self._set_entitlement(
                workspace_id,
                "ai.transcription_seconds.monthly",
                41,
            )
        )
        exhausted_media = asyncio.run(
            self._create_voice_media(workspace_id, str(auth["user"]["id"]))
        )
        with patch(
            "app.api.v1.routes.ai.transcribe_with_openai",
            new_callable=AsyncMock,
        ) as transcribe:
            exhausted = self.client.post(
                f"/api/v1/workspaces/{workspace_id}/ideas/transcribe-topic",
                headers=self.csrf(auth),
                json={"media_id": exhausted_media},
            )
        self.assertEqual(exhausted.status_code, 402, exhausted.text)
        self.assertEqual(exhausted.json()["error"]["code"], "limit_exceeded")
        self.assertEqual(transcribe.await_count, 0)

    def test_server_side_media_read_is_bounded(self) -> None:
        settings = Settings(
            s3_bucket="test-bucket",
            s3_access_key_id="test-access",
            s3_secret_access_key="test-secret",
            s3_endpoint_url="https://storage.example.test",
        )
        media = MediaAsset(
            id=uuid4(),
            workspace_id=uuid4(),
            storage_key="workspaces/test/media/test/voice.webm",
            bucket="test-bucket",
            kind="voice",
            mime_type="audio/webm",
            size_bytes=1,
            created_by=uuid4(),
        )

        class FakeClient:
            def __init__(self, response):
                self.response = response

            def get_object(self, **_kwargs):
                return self.response

        header_body = io.BytesIO(b"oversized")
        with patch(
            "app.modules.content.service.make_s3_client",
            return_value=FakeClient(
                {"ContentLength": 9, "Body": header_body}
            ),
        ):
            with self.assertRaisesRegex(ContentProviderError, "server-side"):
                fetch_s3_object_bytes(settings, media, max_bytes=4)
        self.assertTrue(header_body.closed)

        bounded_body = io.BytesIO(b"oversized")
        with patch(
            "app.modules.content.service.make_s3_client",
            return_value=FakeClient({"Body": bounded_body}),
        ):
            with self.assertRaisesRegex(ContentProviderError, "server-side"):
                fetch_s3_object_bytes(settings, media, max_bytes=4)
        self.assertTrue(bounded_body.closed)

    def test_transcribe_topic_failure_and_empty_result_are_terminal(self) -> None:
        auth = self.register(email="voice-terminal@example.com")
        workspace_id = str(auth["workspace"]["id"])
        self.enable_openai_stt(auth)
        failed_media = asyncio.run(
            self._create_voice_media(workspace_id, str(auth["user"]["id"]))
        )
        with (
            patch(
                "app.api.v1.routes.ai.fetch_s3_object_bytes",
                return_value=b"voice",
            ),
            patch(
                "app.api.v1.routes.ai.transcribe_with_openai",
                new_callable=AsyncMock,
                side_effect=ContentProviderError(
                    "openai_request_failed", "STT failed."
                ),
            ) as transcribe,
        ):
            failed = self.client.post(
                f"/api/v1/workspaces/{workspace_id}/ideas/transcribe-topic",
                headers=self.csrf(auth),
                json={"media_id": failed_media},
            )
            repeated = self.client.post(
                f"/api/v1/workspaces/{workspace_id}/ideas/transcribe-topic",
                headers=self.csrf(auth),
                json={"media_id": failed_media},
            )
        self.assertEqual(failed.status_code, 503, failed.text)
        self.assertEqual(repeated.status_code, 409, repeated.text)
        self.assertEqual(transcribe.await_count, 1)
        self.assertEqual(
            asyncio.run(self._media(failed_media)).processing_status,
            "failed",
        )

        empty_media = asyncio.run(
            self._create_voice_media(workspace_id, str(auth["user"]["id"]))
        )
        with (
            patch(
                "app.api.v1.routes.ai.fetch_s3_object_bytes",
                return_value=b"voice",
            ),
            patch(
                "app.api.v1.routes.ai.transcribe_with_openai",
                new_callable=AsyncMock,
                return_value=("   ", {}),
            ) as transcribe,
        ):
            empty = self.client.post(
                f"/api/v1/workspaces/{workspace_id}/ideas/transcribe-topic",
                headers=self.csrf(auth),
                json={"media_id": empty_media},
            )
            empty_repeat = self.client.post(
                f"/api/v1/workspaces/{workspace_id}/ideas/transcribe-topic",
                headers=self.csrf(auth),
                json={"media_id": empty_media},
            )
        self.assertEqual(empty.status_code, 422, empty.text)
        self.assertEqual(empty.json()["error"]["code"], "standalone_idea_topic_empty")
        self.assertEqual(empty_repeat.status_code, 409, empty_repeat.text)
        self.assertEqual(transcribe.await_count, 1)
        self.assertEqual(
            asyncio.run(self._media(empty_media)).processing_status,
            "failed",
        )
        events = asyncio.run(
            self._usage_events(workspace_id, "ai.transcription_seconds.monthly")
        )
        self.assertEqual(len(events), 2)

    def test_standalone_validator_rejects_ready_claims_and_unsafe_surface(self) -> None:
        payload = mock_standalone_ideas_payload()
        payload["ideas"][0]["direction"] = (
            "Рассказать о результате, который я уже получил"
        )
        with self.assertRaisesRegex(AiPipelineError, "first-person"):
            normalize_and_validate_standalone_ideas(payload, "результат")

        payload = mock_standalone_ideas_payload()
        payload["ideas"][0]["direction"] = "Посмотреть https://example.com"
        with self.assertRaisesRegex(AiPipelineError, "links"):
            normalize_and_validate_standalone_ideas(payload, "сайт")

        payload = mock_standalone_ideas_payload()
        payload["ideas"][0]["direction"] = "Рассказать о результате 29 августа"
        with self.assertRaisesRegex(AiPipelineError, "numeric"):
            normalize_and_validate_standalone_ideas(payload, "результат")

        payload = mock_standalone_ideas_payload()
        payload["ideas"][0]["direction"] = "Сделайте прививку сегодня"
        with self.assertRaisesRegex(AiPipelineError, "editorial action"):
            normalize_and_validate_standalone_ideas(payload, "здоровье питомца")

        payload = mock_standalone_ideas_payload()
        payload["ideas"][0]["direction"] = (
            "Рассказать читателю: сделайте прививку сегодня"
        )
        with self.assertRaisesRegex(AiPipelineError, "advice"):
            normalize_and_validate_standalone_ideas(payload, "здоровье питомца")

        payload = mock_standalone_ideas_payload()
        payload["ideas"][0]["direction"] = "Рассказать про 5 ошибок"
        with self.assertRaisesRegex(AiPipelineError, "numeric"):
            normalize_and_validate_standalone_ideas(payload, "15 ошибок")

    def test_standalone_validator_requires_materially_distinct_directions(self) -> None:
        payload = mock_standalone_ideas_payload()
        payload["ideas"][0]["title"] = "Рабочий выбор"
        payload["ideas"][0]["direction"] = (
            "Рассказать о рабочем выборе и о том, почему этот выбор важен."
        )
        payload["ideas"][1]["title"] = "Выбор в работе"
        payload["ideas"][1]["direction"] = (
            "Рассказать о рабочем выборе и объяснить, почему этот выбор важен."
        )
        with self.assertRaisesRegex(AiPipelineError, "materially similar"):
            normalize_and_validate_standalone_ideas(payload, "рабочий выбор")

    def test_standalone_validator_allows_new_sentence_without_fake_name(self) -> None:
        payload = mock_standalone_ideas_payload()
        payload["ideas"][0]["direction"] = (
            "Рассказать о теме. Попросить автора назвать реальный опыт."
        )
        result = normalize_and_validate_standalone_ideas(payload, "тема")
        self.assertEqual(len(result["ideas"]), 5)

        payload = mock_standalone_ideas_payload()
        payload["ideas"][0]["direction"] = (
            "Рассказать о выборе, который нужно было сделать."
        )
        result = normalize_and_validate_standalone_ideas(payload, "выбор")
        self.assertEqual(len(result["ideas"]), 5)

        payload = mock_standalone_ideas_payload()
        payload["ideas"][0]["direction"] = (
            "Рассказать читателю: нужно сделать прививку сегодня."
        )
        with self.assertRaisesRegex(AiPipelineError, "advice"):
            normalize_and_validate_standalone_ideas(payload, "здоровье питомца")

        payload = mock_standalone_ideas_payload()
        payload["ideas"][0]["direction"] = (
            "Можно сравнить два реальных подхода автора."
        )
        result = normalize_and_validate_standalone_ideas(payload, "подходы")
        self.assertEqual(len(result["ideas"]), 5)

    def test_standalone_task_uses_configured_internal_idea_model(self) -> None:
        settings = Settings(
            ai_text_provider="openai",
            openai_idea_model="gpt-5.6-luna",
            openai_text_model="gpt-4.1-mini",
        )
        provider = text_provider_for(settings, STANDALONE_IDEA_TASK_TYPE)
        self.assertEqual(provider.model_id, "gpt-5.6-luna")


if __name__ == "__main__":
    unittest.main()
