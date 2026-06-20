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


class Phase09InstagramConnectorTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        db_path = Path(self.tmpdir.name) / "phase09-test.sqlite"
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

    def register(self, email: str = "owner09@example.com") -> dict[str, object]:
        response = self.client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "strong-password-123",
                "display_name": "Test Owner",
                "workspace_name": "Instagram Workspace",
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

    def create_content_with_master(self, auth: dict[str, object], text: str) -> tuple[dict[str, object], dict[str, object]]:
        project, rubric = self.import_food_project(auth)
        created = self.client.post(
            f"/api/v1/projects/{project['id']}/content-items",
            headers=self.csrf_headers(auth),
            json={"rubric_id": rubric["id"], "title_internal": "Phase 09 Instagram"},
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
                structured_document={"kind": "phase09-instagram"},
                character_count=len(text),
                created_by=item.created_by,
            )
            session.add(revision)
            await session.flush()
            item.current_master_revision_id = revision.id
            item.status = "ready_for_publication"
            await session.commit()

    async def _add_media(self, content_id: str, count: int = 3, *, video_index: int | None = None) -> None:
        async with self.SessionLocal() as session:
            item = await session.get(ContentItem, UUID(content_id))
            assert item is not None
            for index in range(count):
                is_video = video_index == index
                media = MediaAsset(
                    id=uuid4(),
                    workspace_id=item.workspace_id,
                    storage_key=f"instagram/media/{index:02d}.{'mp4' if is_video else 'jpg'}",
                    bucket="phase09-media",
                    kind="video" if is_video else "image",
                    mime_type="video/mp4" if is_video else "image/jpeg",
                    size_bytes=2000 + index,
                    checksum=f"instagram-checksum-{index}",
                    width=1080,
                    height=1350,
                    duration_ms=12000 if is_video else None,
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

    async def _external_post_count(self, publication_id: str) -> int:
        async with self.SessionLocal() as session:
            count = await session.scalar(
                select(func.count(ExternalPost.id)).where(
                    ExternalPost.publication_id == UUID(publication_id)
                )
            )
            return int(count or 0)

    def generate_instagram_variant(self, auth: dict[str, object], content_id: str) -> dict[str, object]:
        response = self.client.post(
            f"/api/v1/content-items/{content_id}/generate-variants",
            headers=self.csrf_headers(auth),
            json={"platform_keys": ["instagram"]},
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

    def create_instagram_destination(
        self,
        auth: dict[str, object],
        project_id: str,
        configuration: dict[str, object] | None = None,
    ) -> dict[str, object]:
        response = self.client.post(
            f"/api/v1/projects/{project_id}/destinations",
            headers=self.csrf_headers(auth),
            json={
                "name": f"Instagram {uuid4()}",
                "platform_key": "instagram",
                "connector_key": "instagram_media",
                "configuration": {
                    "delivery_mode": "manual_required",
                    "media_mode": "auto",
                    "media_delivery_base_url": "https://cdn.example.com/public",
                    "account_id": "17841400000000000",
                    "access_token": "META-SECRET-TOKEN",
                    "app_secret": "META-APP-SECRET",
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

    def test_long_master_becomes_manual_required_instagram_package(self) -> None:
        auth = self.register()
        project, content = self.create_content_with_master(auth, "Очень длинный текст. " * 260)
        asyncio.run(self._add_media(content["id"], count=10))
        variant = self.generate_instagram_variant(auth, content["id"])
        self.assertEqual(variant["payload"]["connector_key"], "instagram_media")
        self.assertEqual(variant["validation"]["publication_mode"], "instagram_media")
        self.assertLessEqual(variant["character_count"], 2200)

        approved = self.approve_variant(auth, variant["id"])
        destination = self.create_instagram_destination(auth, project["id"])
        self.assertEqual(destination["configuration"]["access_token"], "***redacted***")
        self.assertEqual(destination["configuration"]["app_secret"], "***redacted***")

        capabilities = self.client.get(f"/api/v1/destinations/{destination['id']}/capabilities")
        self.assertEqual(capabilities.status_code, 200, capabilities.text)
        self.assertEqual(capabilities.json()["hard_limits"]["caption"], 2200)
        self.assertEqual(capabilities.json()["hard_limits"]["hashtags"], 30)
        self.assertFalse(capabilities.json()["automated_delivery"])

        publication = self.create_publication(auth, approved["id"], destination["id"], "phase09-instagram")
        published = self.client.post(
            f"/api/v1/publications/{publication['id']}/publish-now",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(published.status_code, 200, published.text)
        self.assertEqual(published.json()["status"], "manual_required")
        self.assertEqual(asyncio.run(self._external_post_count(publication["id"])), 1)

        payloads = asyncio.run(self._attempt_payloads(publication["id"]))
        response_payload = payloads[0]
        serialized = json.dumps(response_payload, ensure_ascii=False)
        self.assertNotIn("META-SECRET-TOKEN", serialized)
        self.assertNotIn("META-APP-SECRET", serialized)
        payload = response_payload["payload"]
        self.assertEqual(payload["mode"], "carousel")
        self.assertEqual(payload["media_count"], 10)
        self.assertEqual(payload["readiness"]["status"], "blocked")
        self.assertIn("instagram_app_review_required", {item["code"] for item in payload["readiness"]["diagnostics"]})
        self.assertEqual(payload["quota_check"]["method"], "GET /17841400000000000/content_publishing_limit")
        self.assertEqual(payload["container_plan"]["publish"]["method"], "POST /17841400000000000/media_publish")

        retried = self.client.post(
            f"/api/v1/publications/{publication['id']}/retry",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(retried.status_code, 200, retried.text)
        self.assertEqual(retried.json()["status"], "manual_required")
        self.assertEqual(asyncio.run(self._external_post_count(publication["id"])), 1)

    def test_carousel_mode_rejects_single_media_with_actionable_error(self) -> None:
        auth = self.register(email="carousel09@example.com")
        project, content = self.create_content_with_master(auth, "Instagram carousel needs more media.")
        asyncio.run(self._add_media(content["id"], count=1))
        variant = self.approve_variant(auth, self.generate_instagram_variant(auth, content["id"])["id"])
        destination = self.create_instagram_destination(auth, project["id"], {"media_mode": "carousel"})
        publication = self.create_publication(auth, variant["id"], destination["id"], "phase09-carousel")
        published = self.client.post(
            f"/api/v1/publications/{publication['id']}/publish-now",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(published.status_code, 200, published.text)
        self.assertEqual(published.json()["status"], "failed_permanent")
        self.assertEqual(published.json()["last_error_code"], "instagram_carousel_media_count_invalid")

    def test_hashtag_limit_blocks_approval(self) -> None:
        auth = self.register(email="hashtags09@example.com")
        _, content = self.create_content_with_master(
            auth,
            "Instagram caption " + " ".join(f"#tag{index}" for index in range(31)),
        )
        variant = self.generate_instagram_variant(auth, content["id"])
        validated = self.client.post(
            f"/api/v1/platform-variants/{variant['id']}/validate",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(validated.status_code, 200, validated.text)
        self.assertEqual(validated.json()["status"], "invalid")
        codes = {error["code"] for error in validated.json()["validation"]["errors"]}
        self.assertIn("instagram_hashtag_limit_exceeded", codes)
        approved = self.client.post(
            f"/api/v1/platform-variants/{variant['id']}/approve",
            headers=self.csrf_headers(auth),
        )
        self.assertEqual(approved.status_code, 422, approved.text)


if __name__ == "__main__":
    unittest.main()
