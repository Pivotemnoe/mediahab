from __future__ import annotations

import asyncio
import sys
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from fastapi.testclient import TestClient  # noqa: E402

from app.db.base import (  # noqa: E402
    Base,
    ContentItem,
    MediaAsset,
    RetentionCandidate,
    utc_now,
)
from app.db.session import get_session  # noqa: E402
from app.main import create_app  # noqa: E402


class RetentionTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        db_path = Path(self.tmpdir.name) / "retention.sqlite"
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

    def register(self, email: str = "retention@example.com") -> dict[str, object]:
        response = self.client.post("/api/v1/auth/register", json={
            "email": email,
            "password": "strong-password-123",
            "display_name": "Retention Owner",
            "workspace_name": "Retention",
        })
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    @staticmethod
    def headers(auth: dict[str, object]) -> dict[str, str]:
        return {"X-CSRF-Token": str(auth["csrf_token"])}

    def upload(self, auth: dict[str, object], kind: str, filename: str) -> dict[str, object]:
        response = self.client.post(
            "/api/v1/media/presign-upload",
            headers=self.headers(auth),
            json={
                "workspace_id": auth["workspace"]["id"],
                "filename": filename,
                "kind": kind,
                "mime_type": "image/jpeg" if kind == "image" else "audio/webm",
                "size_bytes": 1234,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        media_id = response.json()["media_id"]
        completed = self.client.post(
            f"/api/v1/media/{media_id}/complete-upload",
            headers=self.headers(auth),
            json={"size_bytes": 1234},
        )
        self.assertEqual(completed.status_code, 200, completed.text)
        return completed.json()

    async def expire_media(self, media_id: str) -> None:
        async with self.SessionLocal() as session:
            media = await session.get(MediaAsset, UUID(media_id))
            assert media is not None
            media.retention_until = utc_now() - timedelta(days=10)
            await session.commit()

    async def candidate_count(self) -> int:
        async with self.SessionLocal() as session:
            return int(await session.scalar(select(func.count()).select_from(RetentionCandidate)) or 0)

    async def create_content(self, auth: dict[str, object]) -> UUID:
        response = self.client.post(
            f"/api/v1/workspaces/{auth['workspace']['id']}/projects",
            headers=self.headers(auth),
            json={"name": "Текстовое хранение"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        project = response.json()
        content = self.client.post(
            f"/api/v1/projects/{project['id']}/content-items",
            headers=self.headers(auth),
            json={"rubric_id": None, "title_internal": "Не удалять тестовый текст"},
        )
        self.assertEqual(content.status_code, 200, content.text)
        return UUID(content.json()["id"])

    def test_visible_dates_voice_exclusion_and_idempotent_queue(self) -> None:
        auth = self.register()
        image = self.upload(auth, "image", "photo.jpg")
        voice = self.upload(auth, "voice", "voice.webm")
        self.assertIsNotNone(image["retention_until"])
        self.assertEqual(image["retention_status"], "active")
        self.assertIsNone(voice["retention_until"])
        self.assertEqual(voice["retention_status"], "policy_pending")

        dry_run = self.client.post(
            f"/api/v1/workspaces/{auth['workspace']['id']}/retention/scan",
            headers=self.headers(auth),
            json={"dry_run": True},
        )
        self.assertEqual(dry_run.status_code, 200, dry_run.text)
        self.assertEqual(dry_run.json()["excluded_raw_voice"], 1)
        self.assertEqual(asyncio.run(self.candidate_count()), 0)

        first = self.client.post(
            f"/api/v1/workspaces/{auth['workspace']['id']}/retention/scan",
            headers=self.headers(auth),
            json={"dry_run": False},
        )
        self.assertEqual(first.status_code, 200, first.text)
        first_count = asyncio.run(self.candidate_count())
        second = self.client.post(
            f"/api/v1/workspaces/{auth['workspace']['id']}/retention/scan",
            headers=self.headers(auth),
            json={"dry_run": False},
        )
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual(asyncio.run(self.candidate_count()), first_count)

        summary = self.client.get(f"/api/v1/workspaces/{auth['workspace']['id']}/retention")
        self.assertEqual(summary.status_code, 200, summary.text)
        self.assertEqual(summary.json()["policy"]["original_media_days"], 30)
        self.assertFalse(summary.json()["policy"]["cleanup_enabled"])
        self.assertTrue(any("сырого голоса" in text for text in summary.json()["blockers"]))
        text_cleanup = self.client.patch(
            f"/api/v1/workspaces/{auth['workspace']['id']}/retention",
            headers=self.headers(auth),
            json={
                "text_cleanup_enabled": True,
                "version": summary.json()["policy"]["version"],
            },
        )
        self.assertEqual(text_cleanup.status_code, 422, text_cleanup.text)

    def test_grace_cleanup_gate_retain_and_external_scope(self) -> None:
        auth = self.register("retention-cleanup@example.com")
        image = self.upload(auth, "image", "old.jpg")
        asyncio.run(self.expire_media(str(image["id"])))

        queued = self.client.post(
            f"/api/v1/workspaces/{auth['workspace']['id']}/retention/scan",
            headers=self.headers(auth),
            json={"dry_run": False},
        )
        self.assertEqual(queued.status_code, 200, queued.text)
        media_candidate = next(row for row in queued.json()["candidates"] if row["object_type"] == "media")
        self.assertEqual(media_candidate["status"], "ready")

        disabled = self.client.post(
            f"/api/v1/workspaces/{auth['workspace']['id']}/retention/execute-ready",
            headers=self.headers(auth),
            json={"limit": 10},
        )
        self.assertEqual(disabled.status_code, 409, disabled.text)
        still_available = self.client.get(f"/api/v1/media/{image['id']}")
        self.assertEqual(still_available.status_code, 200, still_available.text)

        retained = self.client.post(
            f"/api/v1/workspaces/{auth['workspace']['id']}/retention/{media_candidate['id']}/retain",
            headers=self.headers(auth),
            json={"extend_days": 30},
        )
        self.assertEqual(retained.status_code, 200, retained.text)
        self.assertEqual(retained.json()["status"], "cancelled")
        refreshed = self.client.get(f"/api/v1/media/{image['id']}").json()
        self.assertEqual(refreshed["retention_status"], "active")

        other = TestClient(self.app, base_url="https://testserver")
        try:
            other_auth = other.post("/api/v1/auth/register", json={
                "email": "retention-other@example.com",
                "password": "strong-password-123",
                "display_name": "Other",
                "workspace_name": "Other",
            }).json()
            hidden = other.get(f"/api/v1/workspaces/{auth['workspace']['id']}/retention")
            self.assertEqual(hidden.status_code, 404)
            self.assertNotEqual(other_auth["workspace"]["id"], auth["workspace"]["id"])
        finally:
            other.close()

    def test_text_is_only_reported_and_never_mutated(self) -> None:
        auth = self.register("retention-text@example.com")
        content_id = asyncio.run(self.create_content(auth))
        scan = self.client.post(
            f"/api/v1/workspaces/{auth['workspace']['id']}/retention/scan",
            headers=self.headers(auth),
            json={"dry_run": False},
        )
        self.assertEqual(scan.status_code, 200, scan.text)
        text_candidate = next(
            row for row in scan.json()["candidates"]
            if row["object_type"] == "content_text" and row["object_id"] == str(content_id)
        )
        self.assertTrue(text_candidate["details"]["destructive_cleanup_blocked"])
        fetched = self.client.get(f"/api/v1/content-items/{content_id}")
        self.assertEqual(fetched.status_code, 200, fetched.text)
        self.assertEqual(fetched.json()["title_internal"], "Не удалять тестовый текст")


if __name__ == "__main__":
    unittest.main()
