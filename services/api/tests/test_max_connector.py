from __future__ import annotations

import asyncio
import json
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
    ContentMedia,
    ContentRevision,
    MediaAsset,
    PublicationAttempt,
    WebhookInbox,
    utc_now,
)
from app.db.session import get_session  # noqa: E402
from app.main import create_app  # noqa: E402


class Phase08MaxConnectorTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        db_path = Path(self.tmpdir.name) / "phase08-test.sqlite"
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

    def register(self, email: str = "owner08@example.com") -> dict[str, object]:
        response = self.client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "strong-password-123",
                "display_name": "Test Owner",
                "workspace_name": "MAX Workspace",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def csrf_headers(self, auth: dict[str, object]) -> dict[str, str]:
        return {"X-CSRF-Token": str(auth["csrf_token"])}

    def fixture_text(self) -> str:
        payload = json.loads((BASE / "fixtures" / "telegram-donika.json").read_text(encoding="utf-8"))
        return str(payload["text"])

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

    def create_content_with_master(self, auth: dict[str, object], text: str) -> tuple[dict[str, object], dict[str, object]]:
        project, rubric = self.import_food_project(auth)
        created = self.client.post(
            f"/api/v1/projects/{project['id']}/content-items",
            headers=self.csrf_headers(auth),
            json={"rubric_id": rubric["id"], "title_internal": "Phase 08 MAX"},
        )
        self.assertEqual(created.status_code, 200, created.text)
        content = created.json()
        asyncio.run(self._set_master_revision(content["id"], text))
        return project, content

    async def _set_master_revision(self, content_id: str, text: str) -> None:
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
                structured_document={"kind": "phase08-max"},
                character_count=len(text),
                created_by=item.created_by,
            )
            session.add(revision)
            await session.flush()
            item.current_master_revision_id = revision.id
            item.status = "ready_for_publication"
            await session.commit()

    async def _add_media(self, content_id: str, count: int = 3) -> None:
        async with self.SessionLocal() as session:
            item = await session.get(ContentItem, UUID(content_id))
            assert item is not None
            for index in range(count):
                is_image = index % 3 != 2
                media = MediaAsset(
                    id=uuid4(),
                    workspace_id=item.workspace_id,
                    storage_key=f"max/media/{index:02d}.{'jpg' if is_image else 'mp4'}",
                    bucket="phase08-media",
                    kind="image" if is_image else "video",
                    mime_type="image/jpeg" if is_image else "video/mp4",
                    size_bytes=1000 + index,
                    checksum=f"max-checksum-{index}",
                    width=1200,
                    height=900,
                    duration_ms=None if is_image else 10000,
                    codec_metadata={},
                    upload_status="uploaded",
                    processing_status="ready",
                    created_by=item.created_by,
                    created_at=utc_now(),
                    updated_at=utc_now(),
                    version=1,
                )
                session.add(media)
                await session.flush()
                session.add(
                    ContentMedia(
                        id=uuid4(),
                        workspace_id=item.workspace_id,
                        content_item_id=item.id,
                        media_asset_id=media.id,
                        role="gallery",
                        sort_order=index,
                        created_at=utc_now(),
                        updated_at=utc_now(),
                    )
                )
            await session.commit()

    async def _attempt_payloads(self, publication_id: str) -> list[dict[str, object]]:
        async with self.SessionLocal() as session:
            attempts = (
                await session.scalars(
                    select(PublicationAttempt)
                    .where(PublicationAttempt.publication_id == UUID(publication_id))
                    .order_by(PublicationAttempt.attempt_number.asc())
                )
            ).all()
            return [
                attempt.response_payload_json
                for attempt in attempts
                if isinstance(attempt.response_payload_json, dict)
            ]

    async def _webhook_headers(self, inbox_id: str) -> dict[str, object]:
        async with self.SessionLocal() as session:
            inbox = await session.get(WebhookInbox, UUID(inbox_id))
            assert inbox is not None
            assert isinstance(inbox.headers_json, dict)
            return inbox.headers_json

    def generate_max_variant(self, auth: dict[str, object], content_id: str) -> dict[str, object]:
        response = self.client.post(
            f"/api/v1/content-items/{content_id}/generate-variants",
            headers=self.csrf_headers(auth),
            json={"platform_keys": ["max"]},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["variants"][0]

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
        return approved.json()

    def create_max_destination(
        self,
        auth: dict[str, object],
        project_id: str,
        configuration: dict[str, object] | None = None,
    ) -> dict[str, object]:
        response = self.client.post(
            f"/api/v1/projects/{project_id}/destinations",
            headers=self.csrf_headers(auth),
            json={
                "name": f"MAX {uuid4()}",
                "platform_key": "max",
                "connector_key": "max_message",
                "configuration": {
                    "chat_id": "123456789",
                    "format": "html",
                    "delivery_mode": "simulate",
                    "access_token": "MAX-SECRET-TOKEN",
                    "webhook_secret": "MaxSecret_123",
                    **(configuration or {}),
                },
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def create_publication(self, auth: dict[str, object], variant_id: str, destination_id: str, key: str) -> dict[str, object]:
        response = self.client.post(
            f"/api/v1/platform-variants/{variant_id}/publications",
            headers={**self.csrf_headers(auth), "Idempotency-Key": key},
            json={"destination_id": destination_id},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_max_variant_clamps_to_4000_and_publishes_header_only_payload(self) -> None:
        auth = self.register()
        project, content = self.create_content_with_master(auth, self.fixture_text())
        asyncio.run(self._add_media(content["id"], count=10))
        variant = self.generate_max_variant(auth, content["id"])
        self.assertEqual(variant["platform_key"], "max")
        self.assertLessEqual(variant["character_count"], 4000)
        self.assertEqual(variant["payload"]["connector_key"], "max_message")
        self.assertEqual(variant["validation"]["publication_mode"], "message")
        approved = self.approve_variant(auth, variant["id"])
        destination = self.create_max_destination(auth, project["id"])
        self.assertEqual(destination["configuration"]["access_token"], "***redacted***")

        capabilities = self.client.get(f"/api/v1/destinations/{destination['id']}/capabilities")
        self.assertEqual(capabilities.status_code, 200, capabilities.text)
        self.assertEqual(capabilities.json()["hard_limits"]["text"], 4000)
        self.assertEqual(capabilities.json()["hard_limits"]["media_count"], "unknown_requires_live_spike")

        publication = self.create_publication(auth, approved["id"], destination["id"], "phase08-max")
        published = self.client.post(
            f"/api/v1/publications/{publication['id']}/publish-now",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(published.status_code, 200, published.text)
        self.assertEqual(published.json()["status"], "published")
        payloads = asyncio.run(self._attempt_payloads(publication["id"]))
        response_payload = payloads[0]
        serialized = json.dumps(response_payload, ensure_ascii=False)
        self.assertNotIn("MAX-SECRET-TOKEN", serialized)
        payload = response_payload["payload"]
        self.assertEqual(payload["bot_api_method"], "POST /messages")
        self.assertEqual(payload["request"]["headers"]["Authorization"], "***redacted***")
        self.assertNotIn("access_token", payload["request"]["query"])
        self.assertEqual(payload["media_count"], 10)
        self.assertEqual(payload["media_count_limit"], "unknown_requires_live_spike")
        self.assertEqual(payload["rate_guidance_rps"], 30)
        self.assertEqual(payload["request"]["body"]["format"], "html")

    def test_attachment_not_ready_is_retryable(self) -> None:
        auth = self.register(email="not-ready08@example.com")
        project, content = self.create_content_with_master(auth, "MAX attachment retry.")
        asyncio.run(self._add_media(content["id"], count=2))
        variant = self.approve_variant(auth, self.generate_max_variant(auth, content["id"])["id"])
        destination = self.create_max_destination(auth, project["id"], {"simulate_attachment_not_ready": True})
        publication = self.create_publication(auth, variant["id"], destination["id"], "phase08-not-ready")
        published = self.client.post(
            f"/api/v1/publications/{publication['id']}/publish-now",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(published.status_code, 200, published.text)
        self.assertEqual(published.json()["status"], "failed_retryable")
        self.assertEqual(published.json()["last_error_code"], "max_attachment_not_ready")
        attempt = self.client.get(f"/api/v1/publications/{publication['id']}/attempts")
        self.assertEqual(attempt.status_code, 200, attempt.text)
        self.assertTrue(attempt.json()["attempts"][0]["retryable"])
        self.assertEqual(attempt.json()["attempts"][0]["response_payload"]["error"]["code"], "attachment.not.ready")

    def test_max_webhook_secret_and_dedupe(self) -> None:
        auth = self.register(email="webhook08@example.com")
        project, _ = self.import_food_project(auth)
        destination = self.create_max_destination(auth, project["id"])
        wrong = self.client.post(
            f"/api/v1/webhooks/max/{destination['id']}",
            headers={"X-Max-Bot-Api-Secret": "wrong"},
            json={"update_type": "message_created", "dedupe_key": "update-1", "update": {"chat_id": 123}},
        )
        self.assertEqual(wrong.status_code, 401, wrong.text)
        first = self.client.post(
            f"/api/v1/webhooks/max/{destination['id']}",
            headers={"X-Max-Bot-Api-Secret": "MaxSecret_123"},
            json={"update_type": "message_created", "dedupe_key": "update-1", "update": {"chat_id": 123}},
        )
        self.assertEqual(first.status_code, 200, first.text)
        second = self.client.post(
            f"/api/v1/webhooks/max/{destination['id']}",
            headers={"X-Max-Bot-Api-Secret": "MaxSecret_123"},
            json={"update_type": "message_created", "dedupe_key": "update-1", "update": {"chat_id": 123}},
        )
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual(first.json()["id"], second.json()["id"])
        stored_headers = asyncio.run(self._webhook_headers(first.json()["id"]))
        serialized = json.dumps(stored_headers, ensure_ascii=False)
        self.assertNotIn("MaxSecret_123", serialized)
        self.assertEqual(stored_headers["x-max-bot-api-secret"], "***redacted***")

    def test_max_rejects_token_in_webhook_url(self) -> None:
        auth = self.register(email="token-query08@example.com")
        project, _ = self.import_food_project(auth)
        response = self.client.post(
            f"/api/v1/projects/{project['id']}/destinations",
            headers=self.csrf_headers(auth),
            json={
                "name": "MAX unsafe webhook",
                "platform_key": "max",
                "connector_key": "max_message",
                "configuration": {
                    "chat_id": "123456789",
                    "webhook_url": "https://example.com/max?access_token=bad",
                },
            },
        )
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(response.json()["error"]["code"], "max_token_in_query_forbidden")


if __name__ == "__main__":
    unittest.main()
