from __future__ import annotations

import asyncio
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import Settings, get_settings  # noqa: E402
from app.db.base import Base, ContentMedia, LockedFact  # noqa: E402
from app.db.session import get_session  # noqa: E402
from app.main import create_app  # noqa: E402


class Phase04ContentMediaVoiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        db_path = Path(self.tmpdir.name) / "phase04-test.sqlite"
        self.engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
        self.SessionLocal = async_sessionmaker(self.engine, expire_on_commit=False)
        asyncio.run(self._create_schema())
        self.app = create_app()

        async def override_session():
            async with self.SessionLocal() as session:
                yield session

        self.app.dependency_overrides[get_session] = override_session
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
        email: str = "owner04@example.com",
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

    async def _locked_fact_count(self, content_id: str) -> int:
        async with self.SessionLocal() as session:
            return int(
                await session.scalar(
                    select(func.count()).select_from(LockedFact).where(LockedFact.content_item_id == UUID(content_id))
                )
                or 0
            )

    async def _media_order(self, content_id: str) -> list[str]:
        async with self.SessionLocal() as session:
            rows = (
                await session.scalars(
                    select(ContentMedia).where(ContentMedia.content_item_id == UUID(content_id)).order_by(ContentMedia.sort_order)
                )
            ).all()
            return [str(row.media_asset_id) for row in rows]

    def create_obzor_content(self, auth: dict[str, object]) -> tuple[dict[str, object], dict[str, object], dict[str, object]]:
        project, rubric = self.import_food_project(auth)
        created = self.client.post(
            f"/api/v1/projects/{project['id']}/content-items",
            headers=self.csrf_headers(auth),
            json={"rubric_id": rubric["id"], "title_internal": "Обзор недели: тест"},
        )
        self.assertEqual(created.status_code, 200, created.text)
        return project, rubric, created.json()

    def override_settings(self, settings: Settings) -> None:
        self.app.dependency_overrides[get_settings] = lambda: settings

    def clear_settings_override(self) -> None:
        self.app.dependency_overrides.pop(get_settings, None)

    def test_obzor_guided_form_blocks_and_conflict_handling(self) -> None:
        auth = self.register(self.client)
        _, _, content = self.create_obzor_content(auth)

        guided = self.client.get(f"/api/v1/content-items/{content['id']}/guided-form")
        self.assertEqual(guided.status_code, 200, guided.text)
        form = guided.json()
        field_keys = [field["key"] for field in form["ui_schema"]["fields"]]
        self.assertEqual(field_keys, ["basic_info", "atmosphere", "dishes", "conclusion", "media"])
        self.assertNotIn("hook", field_keys)
        self.assertNotIn("ratings", field_keys)
        self.assertIn("hook", form["generated_fields"])
        self.assertIn("ratings", form["generated_fields"])
        dishes = next(field for field in form["ui_schema"]["fields"] if field["key"] == "dishes")
        self.assertTrue(dishes["repeatable"])

        venue = self.client.put(
            f"/api/v1/content-items/{content['id']}/blocks/venue_name",
            headers=self.csrf_headers(auth),
            json={"value": {"text": "Старый город"}, "lock": True, "version": content["version"]},
        )
        self.assertEqual(venue.status_code, 200, venue.text)
        self.assertTrue(venue.json()["is_locked"])

        stale = self.client.patch(
            f"/api/v1/content-items/{content['id']}",
            headers=self.csrf_headers(auth),
            json={"title_internal": "Старая версия", "version": content["version"]},
        )
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(stale.json()["error"]["code"], "version_conflict")

        current = self.client.get(f"/api/v1/content-items/{content['id']}").json()
        dish = self.client.post(
            f"/api/v1/content-items/{content['id']}/repeatable-groups/dishes",
            headers=self.csrf_headers(auth),
            json={
                "version": current["version"],
                "lock": True,
                "values": {
                    "name": {"text": "Уха"},
                    "price": {"amount": 350, "currency": "RUB"},
                    "observations": {"text": "Рыбный вкус нормальный."},
                },
            },
        )
        self.assertEqual(dish.status_code, 200, dish.text)
        self.assertEqual({block["group_index"] for block in dish.json()["blocks"]}, {0})
        self.assertGreaterEqual(asyncio.run(self._locked_fact_count(content["id"])), 4)

        blocks = self.client.get(f"/api/v1/content-items/{content['id']}/blocks")
        self.assertEqual(blocks.status_code, 200, blocks.text)
        keys = {(block["group_key"], block["field_key"]) for block in blocks.json()["blocks"]}
        self.assertIn((None, "venue_name"), keys)
        self.assertIn(("dishes", "name"), keys)

    def test_media_presign_order_and_transcription_accept_lock(self) -> None:
        auth = self.register(self.client, email="media04@example.com", workspace_name="Media Workspace")
        workspace_id = auth["workspace"]["id"]
        _, _, content = self.create_obzor_content(auth)

        atmosphere = self.client.put(
            f"/api/v1/content-items/{content['id']}/blocks/atmosphere",
            headers=self.csrf_headers(auth),
            json={"value": {"text": ""}, "source_type": "voice", "version": content["version"]},
        )
        self.assertEqual(atmosphere.status_code, 200, atmosphere.text)
        block_id = atmosphere.json()["id"]

        voice_presign = self.client.post(
            "/api/v1/media/presign-upload",
            headers=self.csrf_headers(auth),
            json={
                "workspace_id": workspace_id,
                "filename": "atmosphere.webm",
                "kind": "voice",
                "mime_type": "audio/webm",
                "size_bytes": 123456,
                "content_item_id": content["id"],
            },
        )
        self.assertEqual(voice_presign.status_code, 200, voice_presign.text)
        self.assertEqual(voice_presign.json()["method"], "PUT")
        self.assertIn("http://localhost:9100", voice_presign.json()["upload_url"])
        voice_id = voice_presign.json()["media_id"]
        completed_voice = self.client.post(
            f"/api/v1/media/{voice_id}/complete-upload",
            headers=self.csrf_headers(auth),
            json={"duration_ms": 42000, "checksum": "voice-checksum"},
        )
        self.assertEqual(completed_voice.status_code, 200, completed_voice.text)
        self.assertEqual(completed_voice.json()["upload_status"], "uploaded")

        job = self.client.post(
            f"/api/v1/content-blocks/{block_id}/transcribe",
            headers=self.csrf_headers(auth),
            json={"media_id": voice_id, "provider_key": "mock", "mock_transcript": "На летней площадке спокойно."},
        )
        self.assertEqual(job.status_code, 202, job.text)
        accepted = self.client.post(
            f"/api/v1/transcription-jobs/{job.json()['id']}/accept",
            headers=self.csrf_headers(auth),
            json={"corrected_text": "На летней площадке спокойно и удобно.", "lock": True},
        )
        self.assertEqual(accepted.status_code, 200, accepted.text)
        self.assertEqual(accepted.json()["source_type"], "transcription")
        self.assertTrue(accepted.json()["is_locked"])

        image_ids: list[str] = []
        for index in range(2):
            presign = self.client.post(
                "/api/v1/media/presign-upload",
                headers=self.csrf_headers(auth),
                json={
                    "workspace_id": workspace_id,
                    "filename": f"photo-{index}.jpg",
                    "kind": "image",
                    "mime_type": "image/jpeg",
                    "size_bytes": 1000 + index,
                    "content_item_id": content["id"],
                },
            )
            self.assertEqual(presign.status_code, 200, presign.text)
            media_id = presign.json()["media_id"]
            image_ids.append(media_id)
            done = self.client.post(
                f"/api/v1/media/{media_id}/complete-upload",
                headers=self.csrf_headers(auth),
                json={"width": 1200, "height": 900},
            )
            self.assertEqual(done.status_code, 200, done.text)

        current = self.client.get(f"/api/v1/content-items/{content['id']}").json()
        order = self.client.put(
            f"/api/v1/content-items/{content['id']}/media-order",
            headers=self.csrf_headers(auth),
            json={
                "version": current["version"],
                "media": [
                    {"media_id": image_ids[1], "role": "gallery", "sort_order": 0},
                    {"media_id": image_ids[0], "role": "gallery", "sort_order": 1},
                ],
            },
        )
        self.assertEqual(order.status_code, 200, order.text)
        self.assertEqual(asyncio.run(self._media_order(content["id"])), [image_ids[1], image_ids[0]])

    def test_s3_presign_uses_configured_storage(self) -> None:
        auth = self.register(self.client, email="s3-04@example.com", workspace_name="S3 Workspace")
        workspace_id = auth["workspace"]["id"]
        settings = Settings(
            s3_endpoint_url="https://s3.timeweb.example",
            s3_public_base_url="https://s3.timeweb.example",
            s3_bucket="timeweb-media",
            s3_access_key_id="access",
            s3_secret_access_key="secret",
            media_presign_ttl_seconds=600,
        )
        fake_s3 = Mock()
        fake_s3.generate_presigned_url.return_value = "https://s3.timeweb.example/timeweb-media/signed"
        self.override_settings(settings)
        try:
            with patch("app.modules.content.service.make_s3_client", return_value=fake_s3):
                presign = self.client.post(
                    "/api/v1/media/presign-upload",
                    headers=self.csrf_headers(auth),
                    json={
                        "workspace_id": workspace_id,
                        "filename": "voice.webm",
                        "kind": "voice",
                        "mime_type": "audio/webm",
                        "size_bytes": 10,
                    },
                )
        finally:
            self.clear_settings_override()
        self.assertEqual(presign.status_code, 200, presign.text)
        body = presign.json()
        self.assertEqual(body["bucket"], "timeweb-media")
        self.assertEqual(body["upload_url"], "https://s3.timeweb.example/timeweb-media/signed")
        fake_s3.generate_presigned_url.assert_called_once()
        call = fake_s3.generate_presigned_url.call_args.kwargs
        self.assertEqual(call["Params"]["Bucket"], "timeweb-media")
        self.assertEqual(call["Params"]["ContentType"], "audio/webm")

    def test_openai_transcription_provider_updates_job(self) -> None:
        auth = self.register(self.client, email="openai-stt04@example.com", workspace_name="OpenAI Workspace")
        workspace_id = auth["workspace"]["id"]
        _, _, content = self.create_obzor_content(auth)
        block = self.client.put(
            f"/api/v1/content-items/{content['id']}/blocks/atmosphere",
            headers=self.csrf_headers(auth),
            json={"value": {"text": ""}, "source_type": "voice", "version": content["version"]},
        )
        self.assertEqual(block.status_code, 200, block.text)
        presign = self.client.post(
            "/api/v1/media/presign-upload",
            headers=self.csrf_headers(auth),
            json={
                "workspace_id": workspace_id,
                "filename": "atmosphere.webm",
                "kind": "voice",
                "mime_type": "audio/webm",
                "size_bytes": 100,
                "content_item_id": content["id"],
            },
        )
        self.assertEqual(presign.status_code, 200, presign.text)
        media_id = presign.json()["media_id"]
        settings = Settings(
            stt_provider="openai",
            openai_api_key="test-openai-key",
            openai_stt_model="gpt-4o-mini-transcribe",
        )

        async def fake_openai_transcribe(
            settings: Settings,
            media: object,
            audio_bytes: bytes,
        ) -> tuple[str, dict[str, object]]:
            self.assertEqual(audio_bytes, b"audio")
            return "На летней площадке спокойно.", {"provider": "openai", "model": settings.openai_stt_model}

        self.override_settings(settings)
        try:
            with (
                patch("app.api.v1.routes.content.fetch_s3_object_bytes", return_value=b"audio"),
                patch("app.api.v1.routes.content.transcribe_with_openai", side_effect=fake_openai_transcribe),
            ):
                job = self.client.post(
                    f"/api/v1/content-blocks/{block.json()['id']}/transcribe",
                    headers=self.csrf_headers(auth),
                    json={"media_id": media_id, "provider_key": "openai"},
                )
        finally:
            self.clear_settings_override()
        self.assertEqual(job.status_code, 202, job.text)
        body = job.json()
        self.assertEqual(body["provider_key"], "openai")
        self.assertEqual(body["status"], "completed")
        self.assertEqual(body["transcript_text"], "На летней площадке спокойно.")

    def test_cross_workspace_content_access_returns_404(self) -> None:
        owner_a = self.register(self.client, email="owner-a04@example.com", workspace_name="A Workspace")
        _, _, content = self.create_obzor_content(owner_a)
        other = TestClient(self.app, base_url="https://testserver")
        try:
            self.register(other, email="owner-b04@example.com", workspace_name="B Workspace")
            response = other.get(f"/api/v1/content-items/{content['id']}")
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.json()["error"]["code"], "content_not_found")
        finally:
            other.close()


if __name__ == "__main__":
    unittest.main()
