from __future__ import annotations

import asyncio
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from fastapi.testclient import TestClient  # noqa: E402

from app.db.base import Base, ContentItem, ContentRevision  # noqa: E402
from app.db.session import get_session  # noqa: E402
from app.main import create_app  # noqa: E402


class ContentCreateIdempotencyTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        db_path = Path(self.tmpdir.name) / "content-create-idempotency.sqlite"
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

    def register(self, client: TestClient, *, email: str, workspace_name: str) -> dict[str, object]:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "display_name": "Idempotency Owner",
                "email": email,
                "password": "strong-password-123",
                "workspace_name": workspace_name,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    @staticmethod
    def csrf(auth: dict[str, object]) -> dict[str, str]:
        return {"X-CSRF-Token": str(auth["csrf_token"])}

    def project_and_rubric(self, client: TestClient, auth: dict[str, object]) -> tuple[dict, dict]:
        workspace_id = auth["workspace"]["id"]  # type: ignore[index]
        imported = client.post(
            f"/api/v1/workspaces/{workspace_id}/projects/from-preset",
            headers=self.csrf(auth),
            json={"preset_key": "chto-poest-armavir"},
        )
        self.assertEqual(imported.status_code, 200, imported.text)
        project = imported.json()["project"]
        rubrics = client.get(f"/api/v1/projects/{project['id']}/rubrics")
        self.assertEqual(rubrics.status_code, 200, rubrics.text)
        return project, rubrics.json()["rubrics"][0]

    async def _counts(self, content_id: str) -> tuple[int, int]:
        async with self.SessionLocal() as session:
            item_count = int(
                await session.scalar(
                    select(func.count()).select_from(ContentItem).where(ContentItem.id == UUID(content_id))
                )
                or 0
            )
            revision_count = int(
                await session.scalar(
                    select(func.count()).select_from(ContentRevision).where(
                        ContentRevision.content_item_id == UUID(content_id)
                    )
                )
                or 0
            )
            return item_count, revision_count

    def test_same_request_reuses_item_and_incompatible_title_fails_closed(self) -> None:
        auth = self.register(
            self.client,
            email="idempotent-owner@example.com",
            workspace_name="Idempotent Workspace",
        )
        project, rubric = self.project_and_rubric(self.client, auth)
        client_content_id = str(uuid4())
        path = f"/api/v1/projects/{project['id']}/content-items"
        payload = {
            "client_content_id": client_content_id,
            "rubric_id": rubric["id"],
            "title_internal": "Stable standalone idea",
        }

        created = self.client.post(path, headers=self.csrf(auth), json=payload)
        repeated = self.client.post(path, headers=self.csrf(auth), json=payload)
        self.assertEqual(created.status_code, 200, created.text)
        self.assertEqual(repeated.status_code, 200, repeated.text)
        self.assertEqual(created.json()["id"], client_content_id)
        self.assertEqual(repeated.json()["id"], client_content_id)
        self.assertEqual(asyncio.run(self._counts(client_content_id)), (1, 1))

        conflict = self.client.post(
            path,
            headers=self.csrf(auth),
            json={**payload, "title_internal": "Different retry"},
        )
        self.assertEqual(conflict.status_code, 409, conflict.text)
        self.assertEqual(conflict.json()["error"]["code"], "client_content_id_conflict")
        self.assertNotIn("Stable standalone idea", conflict.text)
        self.assertNotIn(str(project["id"]), conflict.text)

        workspace_id = auth["workspace"]["id"]  # type: ignore[index]
        second_project = self.client.post(
            f"/api/v1/workspaces/{workspace_id}/projects",
            headers=self.csrf(auth),
            json={"name": "Second project"},
        )
        self.assertEqual(second_project.status_code, 200, second_project.text)
        project_collision = self.client.post(
            f"/api/v1/projects/{second_project.json()['id']}/content-items",
            headers=self.csrf(auth),
            json={
                "client_content_id": client_content_id,
                "rubric_id": None,
                "title_internal": "Stable standalone idea",
            },
        )
        self.assertEqual(project_collision.status_code, 409, project_collision.text)
        self.assertEqual(
            project_collision.json()["error"]["code"],
            "client_content_id_conflict",
        )
        self.assertNotIn(str(project["id"]), project_collision.text)

    def test_cross_workspace_collision_fails_closed(self) -> None:
        first_auth = self.register(
            self.client,
            email="first-idempotent@example.com",
            workspace_name="First Workspace",
        )
        first_project, first_rubric = self.project_and_rubric(self.client, first_auth)
        client_content_id = str(uuid4())
        first = self.client.post(
            f"/api/v1/projects/{first_project['id']}/content-items",
            headers=self.csrf(first_auth),
            json={
                "client_content_id": client_content_id,
                "rubric_id": first_rubric["id"],
                "title_internal": "Private first title",
            },
        )
        self.assertEqual(first.status_code, 200, first.text)

        with TestClient(self.app, base_url="https://testserver") as other:
            other_auth = self.register(
                other,
                email="second-idempotent@example.com",
                workspace_name="Second Workspace",
            )
            other_project, other_rubric = self.project_and_rubric(other, other_auth)
            collision = other.post(
                f"/api/v1/projects/{other_project['id']}/content-items",
                headers=self.csrf(other_auth),
                json={
                    "client_content_id": client_content_id,
                    "rubric_id": other_rubric["id"],
                    "title_internal": "Second title",
                },
            )

        self.assertEqual(collision.status_code, 409, collision.text)
        self.assertEqual(collision.json()["error"]["code"], "client_content_id_conflict")
        self.assertNotIn("Private first title", collision.text)
        self.assertNotIn(str(first_project["id"]), collision.text)
        self.assertEqual(asyncio.run(self._counts(client_content_id)), (1, 1))

    def test_concurrent_duplicate_requests_create_one_item_and_revision(self) -> None:
        auth = self.register(
            self.client,
            email="concurrent-idempotent@example.com",
            workspace_name="Concurrent Workspace",
        )
        project, rubric = self.project_and_rubric(self.client, auth)
        client_content_id = str(uuid4())
        path = f"/api/v1/projects/{project['id']}/content-items"
        payload = {
            "client_content_id": client_content_id,
            "rubric_id": rubric["id"],
            "title_internal": "Concurrent stable title",
        }
        barrier = Barrier(2)

        with TestClient(self.app, base_url="https://testserver") as second:
            second.cookies.update(self.client.cookies)

            def create(target: TestClient):
                barrier.wait(timeout=5)
                return target.post(path, headers=self.csrf(auth), json=payload)

            with ThreadPoolExecutor(max_workers=2) as pool:
                responses = list(pool.map(create, (self.client, second)))

        self.assertEqual([response.status_code for response in responses], [200, 200])
        self.assertEqual({response.json()["id"] for response in responses}, {client_content_id})
        self.assertEqual(asyncio.run(self._counts(client_content_id)), (1, 1))


if __name__ == "__main__":
    unittest.main()
