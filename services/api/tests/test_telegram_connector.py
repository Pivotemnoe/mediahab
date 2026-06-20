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
    ExternalPost,
    MediaAsset,
    PublicationAttempt,
    utc_now,
)
from app.db.session import get_session  # noqa: E402
from app.main import create_app  # noqa: E402


class Phase07TelegramConnectorTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        db_path = Path(self.tmpdir.name) / "phase07-test.sqlite"
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
        email: str = "owner07@example.com",
        workspace_name: str = "Telegram Workspace",
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

    def fixture(self) -> dict[str, object]:
        return json.loads((BASE / "fixtures" / "telegram-donika.json").read_text(encoding="utf-8"))

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
        text: str,
    ) -> tuple[dict[str, object], dict[str, object], dict[str, object]]:
        project, rubric = self.import_food_project(auth)
        created = self.client.post(
            f"/api/v1/projects/{project['id']}/content-items",
            headers=self.csrf_headers(auth),
            json={"rubric_id": rubric["id"], "title_internal": "Phase 07 Telegram"},
        )
        self.assertEqual(created.status_code, 200, created.text)
        content = created.json()
        asyncio.run(self._set_master_revision(content["id"], text))
        return project, rubric, content

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
                structured_document={"kind": "phase07-telegram-fixture"},
                character_count=len(text),
                created_by=item.created_by,
            )
            session.add(revision)
            await session.flush()
            item.current_master_revision_id = revision.id
            item.status = "ready_for_publication"
            await session.commit()

    async def _add_fixture_media(self, content_id: str, image_count: int = 7, video_count: int = 3) -> None:
        async with self.SessionLocal() as session:
            item = await session.get(ContentItem, UUID(content_id))
            assert item is not None
            total = image_count + video_count
            for index in range(total):
                is_image = index < image_count
                extension = "jpg" if is_image else "mp4"
                media = MediaAsset(
                    id=uuid4(),
                    workspace_id=item.workspace_id,
                    storage_key=f"telegram/donika/{index:02d}.{extension}",
                    bucket="phase07-media",
                    kind="image" if is_image else "video",
                    mime_type="image/jpeg" if is_image else "video/mp4",
                    size_bytes=1000 + index,
                    checksum=f"checksum-{index}",
                    width=1200 if is_image else 1920,
                    height=900 if is_image else 1080,
                    duration_ms=None if is_image else 15000,
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
                        caption=None,
                        created_at=utc_now(),
                        updated_at=utc_now(),
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

    def generate_telegram_variant(self, auth: dict[str, object], content_id: str) -> dict[str, object]:
        response = self.client.post(
            f"/api/v1/content-items/{content_id}/generate-variants",
            headers=self.csrf_headers(auth),
            json={"platform_keys": ["telegram"]},
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

    def create_telegram_destination(
        self,
        auth: dict[str, object],
        project_id: str,
        configuration: dict[str, object] | None = None,
    ) -> dict[str, object]:
        response = self.client.post(
            f"/api/v1/projects/{project_id}/destinations",
            headers=self.csrf_headers(auth),
            json={
                "name": f"Telegram {uuid4()}",
                "platform_key": "telegram",
                "connector_key": "telegram_rich_message",
                "configuration": {
                    "channel_username": "@test_channel",
                    "media_delivery_base_url": "https://cdn.example.com/media",
                    "delivery_mode": "simulate",
                    "bot_token": "123456:SECRET-TOKEN",
                    **(configuration or {}),
                },
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

    def test_donika_fixture_publishes_as_single_rich_message_contract(self) -> None:
        fixture = self.fixture()
        text = str(fixture["text"])
        self.assertEqual(len(text), fixture["expected_platform_count"])
        auth = self.register()
        project, _, content = self.create_content_with_master(auth, text)
        asyncio.run(self._add_fixture_media(content["id"]))

        variant = self.generate_telegram_variant(auth, content["id"])
        self.assertEqual(variant["platform_key"], "telegram")
        self.assertEqual(variant["character_count"], 4069)
        self.assertEqual(variant["payload"]["connector_key"], "telegram_rich_message")
        self.assertEqual(variant["validation"]["publication_mode"], "rich_message")
        self.assertTrue(variant["validation"]["valid"])
        approved = self.approve_variant(auth, variant["id"])
        destination = self.create_telegram_destination(auth, project["id"])
        self.assertEqual(destination["configuration"]["bot_token"], "***redacted***")

        publication = self.create_publication(auth, approved["id"], destination["id"], "phase07-donika")
        published = self.client.post(
            f"/api/v1/publications/{publication['id']}/publish-now",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(published.status_code, 200, published.text)
        body = published.json()
        self.assertEqual(body["status"], "published")
        self.assertEqual(len(body["external_posts"]), 1)
        self.assertTrue(body["external_posts"][0]["provider_external_id"].startswith("telegram:rich:"))

        payloads = asyncio.run(self._attempt_payloads(publication["id"]))
        self.assertEqual(len(payloads), 1)
        response_payload = payloads[0]
        serialized = json.dumps(response_payload, ensure_ascii=False)
        self.assertNotIn("SECRET-TOKEN", serialized)
        payload = response_payload["payload"]
        self.assertEqual(payload["bot_api_method"], "sendRichMessage")
        self.assertEqual(payload["mode"], "rich_message")
        self.assertEqual(payload["media_count"], 10)
        self.assertEqual(payload["character_count"], 4069)
        self.assertEqual(payload["media_url_ttl_seconds"], 86400)
        rich_html = payload["request"]["rich_message"]["html"]
        self.assertIn("<tg-collage>", rich_html)
        self.assertEqual(rich_html.count("<img "), 7)
        self.assertEqual(rich_html.count("<video "), 3)
        self.assertEqual([media["sort_order"] for media in payload["media"]], list(range(10)))
        self.assertIn("https://www.chto-poest-armavir.ru/", rich_html)
        self.assertEqual(payload["live_acceptance"], "pending_without_credentials")

        retried = self.client.post(
            f"/api/v1/publications/{publication['id']}/retry",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(retried.status_code, 200, retried.text)
        self.assertEqual(asyncio.run(self._external_post_count(publication["id"])), 1)

    def test_fallback_requires_explicit_approval(self) -> None:
        auth = self.register(email="fallback07@example.com", workspace_name="Fallback Workspace")
        project, _, content = self.create_content_with_master(auth, "Telegram fallback contract.")
        asyncio.run(self._add_fixture_media(content["id"], image_count=2, video_count=1))
        variant = self.approve_variant(auth, self.generate_telegram_variant(auth, content["id"])["id"])

        rejected = self.client.post(
            f"/api/v1/projects/{project['id']}/destinations",
            headers=self.csrf_headers(auth),
            json={
                "name": "Telegram fallback rejected",
                "platform_key": "telegram",
                "connector_key": "telegram_rich_message",
                "configuration": {
                    "channel_username": "@test_channel",
                    "media_delivery_base_url": "https://cdn.example.com/media",
                    "telegram_mode": "fallback_media_group",
                },
            },
        )
        self.assertEqual(rejected.status_code, 422, rejected.text)
        self.assertEqual(rejected.json()["error"]["code"], "telegram_fallback_requires_approval")

        destination = self.create_telegram_destination(
            auth,
            project["id"],
            {"telegram_mode": "fallback_media_group", "fallback_approved": True},
        )
        publication = self.create_publication(auth, variant["id"], destination["id"], "phase07-fallback")
        published = self.client.post(
            f"/api/v1/publications/{publication['id']}/publish-now",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(published.status_code, 200, published.text)
        self.assertEqual(published.json()["status"], "published")
        payload = asyncio.run(self._attempt_payloads(publication["id"]))[0]["payload"]
        self.assertEqual(payload["mode"], "fallback_media_group")
        self.assertEqual(payload["bot_api_methods"], ["sendMediaGroup", "sendMessage"])
        self.assertEqual(payload["media_count"], 3)

    def test_telegram_destination_rejects_non_https_media_base(self) -> None:
        auth = self.register(email="https07@example.com", workspace_name="HTTPS Workspace")
        project, _ = self.import_food_project(auth)
        response = self.client.post(
            f"/api/v1/projects/{project['id']}/destinations",
            headers=self.csrf_headers(auth),
            json={
                "name": "Telegram unsafe media",
                "platform_key": "telegram",
                "connector_key": "telegram_rich_message",
                "configuration": {
                    "channel_username": "@test_channel",
                    "media_delivery_base_url": "http://cdn.example.com/media",
                },
            },
        )
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(response.json()["error"]["code"], "telegram_media_delivery_https_required")


if __name__ == "__main__":
    unittest.main()
