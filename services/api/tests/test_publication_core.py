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
from app.db.base import (  # noqa: E402
    Base,
    ContentItem,
    ContentRevision,
    ExternalPost,
    Membership,
    OutboxEvent,
    Publication,
    utc_now,
)
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
        client: TestClient | None = None,
    ) -> dict[str, object]:
        target_client = client or self.client
        response = target_client.post(
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

    async def _add_membership(
        self,
        workspace_id: str,
        user_id: str,
        role: str = "editor",
        publication_permission: str = "approval_required",
    ) -> None:
        async with self.SessionLocal() as session:
            session.add(
                Membership(
                    workspace_id=UUID(workspace_id),
                    user_id=UUID(user_id),
                    role_key=role,
                    publication_permission=publication_permission,
                    accepted_at=utc_now(),
                    created_at=utc_now(),
                    updated_at=utc_now(),
                    version=1,
                )
            )
            await session.commit()

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

    async def _outbox_events(self, publication_id: str) -> list[dict[str, object]]:
        async with self.SessionLocal() as session:
            events = (
                await session.scalars(
                    select(OutboxEvent)
                    .where(OutboxEvent.aggregate_id == UUID(publication_id))
                    .order_by(OutboxEvent.created_at.asc())
                )
            ).all()
            return [
                {
                    "status": event.status,
                    "available_at": event.available_at.isoformat(),
                    "processed_at": event.processed_at.isoformat() if event.processed_at else None,
                }
                for event in events
            ]

    async def _add_pending_publish_event(self, publication_id: str) -> None:
        async with self.SessionLocal() as session:
            row = await session.get(Publication, UUID(publication_id))
            assert row is not None
            session.add(
                OutboxEvent(
                    id=uuid4(),
                    workspace_id=row.workspace_id,
                    aggregate_type="publication",
                    aggregate_id=row.id,
                    event_type="publication.publish",
                    payload_json={"publication_id": str(row.id), "restart_probe": True},
                    status="pending",
                    attempt_count=0,
                    max_attempts=1,
                    available_at=utc_now(),
                    created_at=utc_now(),
                    updated_at=utc_now(),
                )
            )
            await session.commit()

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

    def test_worker_restart_probe_does_not_duplicate_external_posts(self) -> None:
        auth = self.register(email="restart10@example.com", workspace_name="Restart Workspace")
        project, _, content, _ = self.create_content_with_master(auth)
        variants = self.generate_variants(auth, content["id"], ["generic_webhook"])
        approved = self.approve_variant(auth, variants["generic_webhook"]["id"])
        destination = self.create_destination(
            auth,
            project["id"],
            "Webhook restart",
            "generic_webhook",
            "generic_webhook",
            {"endpoint_url": "https://example.com/restart", "simulate_status": 202},
        )
        publication = self.create_publication(auth, approved["id"], destination["id"], "phase10-restart")
        published = self.client.post(
            f"/api/v1/publications/{publication['id']}/publish-now",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(published.status_code, 200, published.text)
        self.assertEqual(published.json()["status"], "published")
        self.assertEqual(asyncio.run(self._external_post_count(publication["id"])), 1)

        asyncio.run(self._add_pending_publish_event(publication["id"]))
        replayed = self.client.post(
            f"/api/v1/publications/{publication['id']}/publish-now",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(replayed.status_code, 200, replayed.text)
        self.assertEqual(replayed.json()["status"], "published")
        self.assertEqual(asyncio.run(self._external_post_count(publication["id"])), 1)
        statuses = {event["status"] for event in asyncio.run(self._outbox_events(publication["id"]))}
        self.assertEqual(statuses, {"completed"})

    def test_schedule_reschedule_and_cancel_use_workspace_timezone(self) -> None:
        auth = self.register(email="schedule10@example.com", workspace_name="Schedule Workspace")
        project, _, content, _ = self.create_content_with_master(auth)
        variants = self.generate_variants(auth, content["id"], ["generic_webhook"])
        approved = self.approve_variant(auth, variants["generic_webhook"]["id"])
        destination = self.create_destination(
            auth,
            project["id"],
            "Webhook schedule",
            "generic_webhook",
            "generic_webhook",
            {"endpoint_url": "https://example.com/schedule", "simulate_status": 202},
        )
        publication = self.create_publication(auth, approved["id"], destination["id"], "phase10-schedule")

        scheduled = self.client.post(
            f"/api/v1/publications/{publication['id']}/schedule",
            headers=self.csrf_headers(auth),
            json={"scheduled_at": "2026-06-21T12:00:00"},
        )
        self.assertEqual(scheduled.status_code, 200, scheduled.text)
        self.assertEqual(scheduled.json()["status"], "scheduled")
        self.assertEqual(scheduled.json()["scheduled_at"], "2026-06-21T09:00:00+00:00")
        events = asyncio.run(self._outbox_events(publication["id"]))
        self.assertEqual(len(events), 1)
        self.assertTrue(str(events[0]["available_at"]).startswith("2026-06-21T09:00:00"))

        rescheduled = self.client.post(
            f"/api/v1/publications/{publication['id']}/reschedule",
            headers=self.csrf_headers(auth),
            json={"scheduled_at": "2026-06-22T15:30:00"},
        )
        self.assertEqual(rescheduled.status_code, 200, rescheduled.text)
        self.assertEqual(rescheduled.json()["status"], "scheduled")
        self.assertEqual(rescheduled.json()["scheduled_at"], "2026-06-22T12:30:00+00:00")
        events = asyncio.run(self._outbox_events(publication["id"]))
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["status"], "pending")
        self.assertTrue(str(events[0]["available_at"]).startswith("2026-06-22T12:30:00"))

        cancelled = self.client.post(
            f"/api/v1/publications/{publication['id']}/cancel",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(cancelled.status_code, 200, cancelled.text)
        self.assertEqual(cancelled.json()["status"], "cancelled")
        events = asyncio.run(self._outbox_events(publication["id"]))
        self.assertEqual(events[0]["status"], "completed")
        self.assertIsNotNone(events[0]["processed_at"])

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
        self.assertIsNone(manual_result.json()["publication_method"])
        confirmed = self.client.post(
            f"/api/v1/publications/{manual_publication['id']}/confirm-manual",
            headers=self.csrf_headers(auth),
            json={
                "external_url": "https://example.com/manual-post",
                "external_post_id": "manual-123",
                "evidence": {"note": "posted by owner"},
            },
        )
        self.assertEqual(confirmed.status_code, 200, confirmed.text)
        self.assertEqual(confirmed.json()["status"], "published")
        self.assertEqual(confirmed.json()["publication_method"], "manual")
        self.assertEqual(confirmed.json()["external_post_id"], "manual-123")

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
        self.assertEqual(response.json()["error"]["code"], "webhook_ip_literal_forbidden")
        invalid_port = self.client.post(
            f"/api/v1/projects/{project['id']}/destinations",
            headers=self.csrf_headers(auth),
            json={
                "name": "Invalid port webhook",
                "platform_key": "generic_webhook",
                "connector_key": "generic_webhook",
                "configuration": {"endpoint_url": "https://example.com:abc/webhook"},
            },
        )
        self.assertEqual(invalid_port.status_code, 422, invalid_port.text)
        self.assertEqual(invalid_port.json()["error"]["code"], "webhook_port_forbidden")

    def test_editor_can_prepare_and_export_but_not_publish(self) -> None:
        owner = self.register(email="owner-permissions06@example.com", workspace_name="Permission Workspace")
        editor_client = TestClient(self.app, base_url="https://testserver")
        try:
            editor_auth = self.register(
                email="editor-permissions06b@example.com",
                workspace_name="Editor Workspace",
                client=editor_client,
            )
            asyncio.run(
                self._add_membership(
                    str(owner["workspace"]["id"]),
                    str(editor_auth["user"]["id"]),
                    role="editor",
                    publication_permission="approval_required",
                )
            )
            project, _, content, _ = self.create_content_with_master(owner)
            generated = editor_client.post(
                f"/api/v1/content-items/{content['id']}/generate-variants",
                headers=self.csrf_headers(editor_auth),
                json={"platform_keys": ["manual_export", "generic_webhook"]},
            )
            self.assertEqual(generated.status_code, 200, generated.text)
            variants = {variant["platform_key"]: variant for variant in generated.json()["variants"]}

            editor_approve = editor_client.post(
                f"/api/v1/platform-variants/{variants['generic_webhook']['id']}/approve",
                headers=self.csrf_headers(editor_auth),
            )
            self.assertEqual(editor_approve.status_code, 403, editor_approve.text)

            manual_variant = self.approve_variant(owner, variants["manual_export"]["id"])
            webhook_variant = self.approve_variant(owner, variants["generic_webhook"]["id"])
            manual_destination = self.create_destination(
                owner,
                project["id"],
                "Manual for editor",
                "manual_export",
                "manual_export",
                {},
            )
            webhook_destination = self.create_destination(
                owner,
                project["id"],
                "Webhook for owner",
                "generic_webhook",
                "generic_webhook",
                {"endpoint_url": "https://example.com/webhook", "simulate_status": 202},
            )
            editor_live_destination = editor_client.post(
                f"/api/v1/projects/{project['id']}/destinations",
                headers=self.csrf_headers(editor_auth),
                json={
                    "name": "Editor live webhook",
                    "platform_key": "generic_webhook",
                    "connector_key": "generic_webhook",
                    "configuration": {
                        "endpoint_url": "https://example.com/live",
                        "delivery_mode": "allowlisted_live",
                        "endpoint_challenge_verified": True,
                        "allowlist_id": "staging-example",
                    },
                },
            )
            self.assertEqual(editor_live_destination.status_code, 422, editor_live_destination.text)
            self.assertEqual(
                editor_live_destination.json()["error"]["code"],
                "webhook_live_requires_owner_admin",
            )
            owner_unverified_live = self.client.post(
                f"/api/v1/projects/{project['id']}/destinations",
                headers=self.csrf_headers(owner),
                json={
                    "name": "Owner unverified live webhook",
                    "platform_key": "generic_webhook",
                    "connector_key": "generic_webhook",
                    "configuration": {
                        "endpoint_url": "https://example.com/live",
                        "delivery_mode": "allowlisted_live",
                        "allowlist_id": "staging-example",
                    },
                },
            )
            self.assertEqual(owner_unverified_live.status_code, 422, owner_unverified_live.text)
            self.assertEqual(
                owner_unverified_live.json()["error"]["code"],
                "webhook_challenge_required",
            )

            manual_publication = editor_client.post(
                f"/api/v1/platform-variants/{manual_variant['id']}/publications",
                headers=self.csrf_headers(editor_auth),
                json={"destination_id": manual_destination["id"], "idempotency_key": "editor-manual"},
            )
            self.assertEqual(manual_publication.status_code, 200, manual_publication.text)
            manual_export = editor_client.post(
                f"/api/v1/publications/{manual_publication.json()['id']}/publish-now",
                headers=self.csrf_headers(editor_auth),
            )
            self.assertEqual(manual_export.status_code, 200, manual_export.text)
            self.assertEqual(manual_export.json()["status"], "manual_required")

            editor_confirm = editor_client.post(
                f"/api/v1/publications/{manual_publication.json()['id']}/confirm-manual",
                headers=self.csrf_headers(editor_auth),
                json={"external_url": "https://example.com/manual"},
            )
            self.assertEqual(editor_confirm.status_code, 403, editor_confirm.text)

            webhook_publication = editor_client.post(
                f"/api/v1/platform-variants/{webhook_variant['id']}/publications",
                headers=self.csrf_headers(editor_auth),
                json={"destination_id": webhook_destination["id"], "idempotency_key": "editor-webhook"},
            )
            self.assertEqual(webhook_publication.status_code, 403, webhook_publication.text)
        finally:
            editor_client.close()
