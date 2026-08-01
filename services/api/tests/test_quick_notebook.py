from __future__ import annotations

import asyncio
import sys
import tempfile
import unittest
from pathlib import Path
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from fastapi.testclient import TestClient  # noqa: E402

from app.db.base import (  # noqa: E402
    Base,
    ContentBlock,
    ContentItem,
    MediaAsset,
    NotebookNote,
    NotebookTransfer,
    UsageEvent,
)
from app.db.session import get_session  # noqa: E402
from app.main import create_app  # noqa: E402


class QuickNotebookTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        db_path = Path(self.tmpdir.name) / "notebook.sqlite"
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

    def register(self, email: str = "notes@example.com", workspace: str = "Notes") -> dict[str, object]:
        response = self.client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "strong-password-123",
                "display_name": "Notebook Owner",
                "workspace_name": workspace,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    @staticmethod
    def headers(auth: dict[str, object]) -> dict[str, str]:
        return {"X-CSRF-Token": str(auth["csrf_token"])}

    def create_note(self, auth: dict[str, object], body: str = "Идея для публикации") -> dict[str, object]:
        response = self.client.post(
            "/api/v1/notebook",
            headers=self.headers(auth),
            json={"workspace_id": auth["workspace"]["id"], "body": body, "kind": "idea"},
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def create_project(self, auth: dict[str, object]) -> dict[str, object]:
        response = self.client.post(
            f"/api/v1/workspaces/{auth['workspace']['id']}/projects",
            headers=self.headers(auth),
            json={"name": "Канал блокнота", "tone_config": {"voice": "живой"}},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    async def _count(self, model: type) -> int:
        async with self.SessionLocal() as session:
            return int(await session.scalar(select(func.count()).select_from(model)) or 0)

    async def _media(self, media_id: str) -> MediaAsset:
        async with self.SessionLocal() as session:
            media = await session.get(MediaAsset, UUID(media_id))
            assert media is not None
            return media

    def test_note_lifecycle_search_conflict_and_workspace_isolation(self) -> None:
        auth = self.register()
        note = self.create_note(auth, "Найти эту идею про летнее меню")

        listed = self.client.get(
            f"/api/v1/notebook?workspace_id={auth['workspace']['id']}&q=летнее"
        )
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertEqual([row["id"] for row in listed.json()["notes"]], [note["id"]])

        updated = self.client.patch(
            f"/api/v1/notebook/{note['id']}",
            headers=self.headers(auth),
            json={"body": "Исправленная идея", "pinned": True, "version": note["version"]},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertTrue(updated.json()["pinned"])

        stale = self.client.patch(
            f"/api/v1/notebook/{note['id']}",
            headers=self.headers(auth),
            json={"body": "Потерянная правка", "version": note["version"]},
        )
        self.assertEqual(stale.status_code, 409, stale.text)

        deleted = self.client.delete(f"/api/v1/notebook/{note['id']}", headers=self.headers(auth))
        self.assertTrue(deleted.json()["deleted"])
        trash = self.client.get(
            f"/api/v1/notebook?workspace_id={auth['workspace']['id']}&deleted=true"
        )
        self.assertEqual(len(trash.json()["notes"]), 1)
        restored = self.client.post(
            f"/api/v1/notebook/{note['id']}/restore", headers=self.headers(auth)
        )
        self.assertFalse(restored.json()["deleted"])

        other = TestClient(self.app, base_url="https://testserver")
        try:
            second = other.post(
                "/api/v1/auth/register",
                json={
                    "email": "other-notes@example.com",
                    "password": "strong-password-123",
                    "display_name": "Other",
                    "workspace_name": "Other Notes",
                },
            ).json()
            hidden = other.get(f"/api/v1/notebook?workspace_id={auth['workspace']['id']}")
            self.assertEqual(hidden.status_code, 404)
            self.assertEqual(second["workspace"]["name"], "Other Notes")
        finally:
            other.close()

    def test_non_destructive_transfer_and_duplicate_protection(self) -> None:
        auth = self.register()
        note = self.create_note(auth, "Первая мысль из блокнота")
        project = self.create_project(auth)

        created = self.client.post(
            f"/api/v1/notebook/{note['id']}/transfer",
            headers=self.headers(auth),
            json={"project_id": project["id"], "rubric_id": None},
        )
        self.assertEqual(created.status_code, 200, created.text)
        transfer = created.json()
        self.assertEqual(transfer["transfer_type"], "create")
        self.assertIn(f"edit={transfer['content_item_id']}", transfer["composer_url"])
        self.assertEqual(asyncio.run(self._count(NotebookNote)), 1)
        self.assertEqual(asyncio.run(self._count(ContentItem)), 1)

        duplicate_create = self.client.post(
            f"/api/v1/notebook/{note['id']}/transfer",
            headers=self.headers(auth),
            json={"project_id": project["id"]},
        )
        self.assertEqual(duplicate_create.status_code, 409, duplicate_create.text)
        self.assertEqual(asyncio.run(self._count(ContentItem)), 1)

        current_note = self.client.get(
            f"/api/v1/notebook?workspace_id={auth['workspace']['id']}"
        ).json()["notes"][0]
        changed = self.client.patch(
            f"/api/v1/notebook/{note['id']}",
            headers=self.headers(auth),
            json={"body": "Вторая мысль", "version": current_note["version"]},
        ).json()
        appended = self.client.post(
            f"/api/v1/notebook/{note['id']}/transfer",
            headers=self.headers(auth),
            json={"content_item_id": transfer["content_item_id"]},
        )
        self.assertEqual(appended.status_code, 200, appended.text)
        self.assertEqual(appended.json()["note_version"], changed["version"])
        duplicate_append = self.client.post(
            f"/api/v1/notebook/{note['id']}/transfer",
            headers=self.headers(auth),
            json={"content_item_id": transfer["content_item_id"]},
        )
        self.assertEqual(duplicate_append.status_code, 409, duplicate_append.text)
        self.assertEqual(asyncio.run(self._count(NotebookTransfer)), 2)
        self.assertGreaterEqual(asyncio.run(self._count(ContentBlock)), 1)

    def test_voice_transcription_accepts_text_and_sets_short_raw_audio_retention(self) -> None:
        auth = self.register()
        note = self.create_note(auth, "Начало")
        presign = self.client.post(
            "/api/v1/media/presign-upload",
            headers=self.headers(auth),
            json={
                "workspace_id": auth["workspace"]["id"],
                "content_item_id": None,
                "filename": "note.webm",
                "kind": "voice",
                "mime_type": "audio/webm",
                "size_bytes": 120,
            },
        )
        self.assertEqual(presign.status_code, 200, presign.text)
        media_id = presign.json()["media_id"]
        complete = self.client.post(
            f"/api/v1/media/{media_id}/complete-upload",
            headers=self.headers(auth),
            json={"size_bytes": 120},
        )
        self.assertEqual(complete.status_code, 200, complete.text)

        transcribed = self.client.post(
            f"/api/v1/notebook/{note['id']}/transcribe",
            headers=self.headers(auth),
            json={
                "media_id": media_id,
                "provider_key": "mock",
                "mock_transcript": "Голосовая идея",
            },
        )
        self.assertEqual(transcribed.status_code, 202, transcribed.text)
        accepted = self.client.post(
            f"/api/v1/notebook-transcriptions/{transcribed.json()['id']}/accept",
            headers=self.headers(auth),
            json={"corrected_text": "Голосовая идея", "append": True, "note_version": note["version"]},
        )
        self.assertEqual(accepted.status_code, 200, accepted.text)
        self.assertEqual(accepted.json()["body"], "Начало\n\nГолосовая идея")
        media = asyncio.run(self._media(media_id))
        self.assertIsNotNone(media.retention_until)
        self.assertEqual(asyncio.run(self._count(UsageEvent)), 1)


if __name__ == "__main__":
    unittest.main()
