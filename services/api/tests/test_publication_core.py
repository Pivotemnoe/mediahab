from __future__ import annotations

import asyncio
import sys
import tempfile
import unittest
from pathlib import Path
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import Settings, get_settings  # noqa: E402
from app.db.base import Base, ContentItem, ContentRevision, ExternalPost, OutboxEvent  # noqa: E402
from app.db.session import get_session  # noqa: E402
from app.main import create_app  # noqa: E402


class Phase06PublicationCoreTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        db_path = Path(self.tmpdir.name) / "phase06-test.sqlite"
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
        email: str = "owner06@example.com",
        workspace_name: str = "Owner Workspace",
    ) -> dict[str, object]:
        response = self.client.post(
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

    def csrf_headers(self, auth: dict[str, object]) -> dict[str, str]:
        return {"X-CSRF-Token": str(auth["csrf_token"])}

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
        rubric = next(rubric for rubric in rubrics.json()["rubrics"] if rubric["slug"] == "obzor-nedeli")
        return project, rubric

    def create_content_with_master(
        self,
        auth: dict[str, object],
        text: str | None = None,
    ) -> tuple[dict[str, object], dict[str, object], dict[str, object], str]:
        project, rubric = self.import_food_project(auth)
        created = self.client.post(
            f"/api/v1/projects/{project['id']}/content-items",
            headers=self.csrf_headers(auth),
            json={"rubric_id": rubric["id"], "title_internal": "Phase 06 публикация"},
        )
        self.assertEqual(created.status_code, 200, created.text)
        content = created.json()
        revision_id = asyncio.run(
            self._set_master_revision(
                content["id"],
                text
                or (
                    "🔥 Тестовый обзор для публикации.\n\n"
                    "Атмосфера спокойная, блюда разобраны по вкусу и цене, вывод честный. "
                    "Этот текст нужен для проверки платформенных вариантов и публикационного ядра."
                ),
            )
        )
        return project, rubric, content, revision_id

    async def _set_master_revision(self, content_id: str, text: str) -> str:
        async with self.SessionLocal() as session:
            item = await session.get(ContentItem, UUID(content_id))
            assert item is not None
            latest = await session.scalar(
                select(func.max(ContentRevision.revision_number)).where(
                    ContentRevision.content_item_id == item.id
                )
            )
            revision = ContentRevision(
                id=uuid4(),
                workspace_id=item.workspace_id,
                content_item_id=item.id,
                revision_number=int(latest or 0) + 1,
                revision_type="ai_master",
                text=text,
                structured_document={"kind": "phase06-test-master"},
                character_count=len(text),
                created_by=item.created_by,
            )
            session.add(revision)
            await session.flush()
            item.current_master_revision_id = revision.id
            item.status = "ready_for_publication"
            await session.commit()
            return str(revision.id)

    async def _external_post_count(self, publication_id: str) -> int:
        async with self.SessionLocal() as session:
            return int(
                await session.scalar(
                    select(func.count()).select_from(ExternalPost).where(
                        ExternalPost.publication_id == UUID(publication_id)
                    )
                )
                or 0
            )

    async def _outbox_count(self, publication_id: str) -> int:
        async with self.SessionLocal() as session:
            return int(
                await session.scalar(
                    select(func.count()).select_from(OutboxEvent).where(
                        OutboxEvent.aggregate_id == UUID(publication_id)
                    )
                )
                or 0
            )

    def generate_variants(
        self,
        auth: dict[str, object],
        content_id: str,
        platforms: list[str],
    ) -> dict[str, dict[str, object]]:
        response = self.client.post(
            f"/api/v1/content-items/{content_id}/generate-variants",
            headers=self.csrf_headers(auth),
            json={"platform_keys": platforms},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return {variant["platform_key"]: variant for variant in response.json()["variants"]}

    def approve_variant(self, auth: dict[str, object], variant_id: str) -> dict[str, object]:
        validated = self.client.post(
            f"/api/v1/platform-variants/{variant_id}/validate",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(validated.status_code, 200, validated.text)
        approved = self.client.post(
            f"/api/v1/platform-variants/{variant_id}/approve",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(approved.status_code, 200, approved.text)
        self.assertEqual(approved.json()["status"], "approved")
        return approved.json()

    def create_destination(
        self,
        auth: dict[str, object],
        project_id: str,
        name: str,
        platform_key: str,
        connector_key: str,
        configuration: dict[str, object],
    ) -> dict[str, object]:
        response = self.client.post(
            f"/api/v1/projects/{project_id}/destinations",
            headers=self.csrf_headers(auth),
            json={
                "name": name,
                "platform_key": platform_key,
                "connector_key": connector_key,
                "configuration": configuration,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def create_publication(
        self,
        auth: dict[str, object],
        variant_id: str,
        destination_id: str,
        key: str,
    ) -> dict[str, object]:
        response = self.client.post(
            f"/api/v1/platform-variants/{variant_id}/publications",
            headers={**self.csrf_headers(auth), "Idempotency-Key": key},
            json={"destination_id": destination_id},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_platform_variants_respect_destination_limits(self) -> None:
        auth = self.register()
        _, _, content, _ = self.create_content_with_master(auth, text="Очень длинный текст. " * 320)
        variants = self.generate_variants(auth, content["id"], ["telegram", "max", "instagram"])

        self.assertLessEqual(variants["telegram"]["character_count"], 32768)
        self.assertLessEqual(variants["max"]["character_count"], 4000)
        self.assertLessEqual(variants["instagram"]["character_count"], 2200)
        self.assertEqual(variants["max"]["validation"]["valid"], True)
        self.assertEqual(variants["instagram"]["validation"]["valid"], True)

    def test_unapproved_variant_cannot_be_queued(self) -> None:
        auth = self.register(email="unapproved06@example.com", workspace_name="Unapproved Workspace")
        project, _, content, _ = self.create_content_with_master(auth)
        variants = self.generate_variants(auth, content["id"], ["generic_webhook"])
        destination = self.create_destination(
            auth,
            project["id"],
            "Webhook",
            "generic_webhook",
            "generic_webhook",
            {"endpoint_url": "https://example.com/webhook", "simulate_status": 202},
        )
        response = self.client.post(
            f"/api/v1/platform-variants/{variants['generic_webhook']['id']}/publications",
            headers=self.csrf_headers(auth),
            json={"destination_id": destination["id"]},
        )
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(response.json()["error"]["code"], "variant_approval_required")

    def test_publish_now_is_durable_and_retry_is_idempotent(self) -> None:
        auth = self.register(email="publish06@example.com", workspace_name="Publish Workspace")
        project, _, content, _ = self.create_content_with_master(auth)
        variants = self.generate_variants(auth, content["id"], ["generic_webhook"])
        approved = self.approve_variant(auth, variants["generic_webhook"]["id"])
        destination = self.create_destination(
            auth,
            project["id"],
            "Webhook OK",
            "generic_webhook",
            "generic_webhook",
            {"endpoint_url": "https://example.com/webhook", "simulate_status": 202},
        )
        publication = self.create_publication(auth, approved["id"], destination["id"], "phase06-idempotent")

        published = self.client.post(
            f"/api/v1/publications/{publication['id']}/publish-now",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(published.status_code, 200, published.text)
        self.assertEqual(published.json()["status"], "published")
        self.assertEqual(len(published.json()["external_posts"]), 1)
        self.assertGreaterEqual(asyncio.run(self._outbox_count(publication["id"])), 1)

        retried = self.client.post(
            f"/api/v1/publications/{publication['id']}/retry",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(retried.status_code, 200, retried.text)
        self.assertEqual(retried.json()["status"], "published")
        self.assertEqual(asyncio.run(self._external_post_count(publication["id"])), 1)

    def test_partial_success_and_attempt_history_are_visible(self) -> None:
        auth = self.register(email="partial06@example.com", workspace_name="Partial Workspace")
        project, _, content, _ = self.create_content_with_master(auth)
        variants = self.generate_variants(auth, content["id"], ["manual_export", "generic_webhook"])
        manual_variant = self.approve_variant(auth, variants["manual_export"]["id"])
        webhook_variant = self.approve_variant(auth, variants["generic_webhook"]["id"])
        manual_destination = self.create_destination(
            auth,
            project["id"],
            "Ручной экспорт",
            "manual_export",
            "manual_export",
            {},
        )
        failing_destination = self.create_destination(
            auth,
            project["id"],
            "Webhook Fail",
            "generic_webhook",
            "generic_webhook",
            {"endpoint_url": "https://example.com/fail", "simulate_status": 503},
        )
        manual_publication = self.create_publication(
            auth,
            manual_variant["id"],
            manual_destination["id"],
            "phase06-manual",
        )
        failing_publication = self.create_publication(
            auth,
            webhook_variant["id"],
            failing_destination["id"],
            "phase06-fail",
        )

        manual_result = self.client.post(
            f"/api/v1/publications/{manual_publication['id']}/publish-now",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(manual_result.status_code, 200, manual_result.text)
        self.assertEqual(manual_result.json()["status"], "manual_required")

        failing_result = self.client.post(
            f"/api/v1/publications/{failing_publication['id']}/publish-now",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(failing_result.status_code, 200, failing_result.text)
        self.assertEqual(failing_result.json()["status"], "failed_retryable")
        attempts = self.client.get(f"/api/v1/publications/{failing_publication['id']}/attempts")
        self.assertEqual(attempts.status_code, 200, attempts.text)
        self.assertEqual(attempts.json()["attempts"][0]["status"], "failed_retryable")
        self.assertEqual(attempts.json()["attempts"][0]["retryable"], True)

    def test_generic_webhook_rejects_private_network_targets(self) -> None:
        auth = self.register(email="ssrf06@example.com", workspace_name="SSRF Workspace")
        project, _ = self.import_food_project(auth)
        response = self.client.post(
            f"/api/v1/projects/{project['id']}/destinations",
            headers=self.csrf_headers(auth),
            json={
                "name": "Unsafe webhook",
                "platform_key": "generic_webhook",
                "connector_key": "generic_webhook",
                "configuration": {"endpoint_url": "https://127.0.0.1/webhook"},
            },
        )
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(response.json()["error"]["code"], "webhook_private_target")
