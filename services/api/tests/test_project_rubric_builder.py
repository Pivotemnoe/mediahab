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

from app.db.base import Base, Project, ProjectVersion, Rubric, RubricVersion  # noqa: E402
from app.db.session import get_session  # noqa: E402
from app.main import create_app  # noqa: E402


class Phase03ProjectRubricBuilderTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        db_path = Path(self.tmpdir.name) / "phase03-test.sqlite"
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
        email: str = "owner@example.com",
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

    async def _rubric_version_count(self, rubric_id: str) -> int:
        async with self.SessionLocal() as session:
            return int(
                await session.scalar(
                    select(func.count()).select_from(RubricVersion).where(RubricVersion.rubric_id == UUID(rubric_id))
                )
                or 0
            )

    async def _project_count(self, workspace_id: str) -> int:
        async with self.SessionLocal() as session:
            return int(
                await session.scalar(
                    select(func.count()).select_from(Project).where(Project.workspace_id == UUID(workspace_id))
                )
                or 0
            )

    async def _parent_versions(self, project_id: str, rubric_id: str) -> tuple[int, int]:
        async with self.SessionLocal() as session:
            project_version = await session.scalar(
                select(Project.version).where(Project.id == UUID(project_id))
            )
            rubric_version = await session.scalar(
                select(Rubric.version).where(Rubric.id == UUID(rubric_id))
            )
            assert project_version is not None
            assert rubric_version is not None
            return int(project_version), int(rubric_version)

    async def _preset_obzor_state(self, workspace_id: str) -> tuple[int, int | None]:
        async with self.SessionLocal() as session:
            row = (
                await session.execute(
                    select(Rubric, RubricVersion)
                    .join(Project, Project.id == Rubric.project_id)
                    .join(RubricVersion, RubricVersion.id == Rubric.active_version_id)
                    .where(
                        Project.workspace_id == UUID(workspace_id),
                        Project.preset_key == "chto-poest-armavir",
                        Rubric.slug == "obzor-nedeli",
                    )
                )
            ).first()
            assert row is not None
            rubric, version = row
            count = int(
                await session.scalar(
                    select(func.count()).select_from(RubricVersion).where(RubricVersion.rubric_id == rubric.id)
                )
                or 0
            )
            return count, version.editorial_max_chars

    def test_owner_creates_project_and_repeatable_rubric_then_new_version(self) -> None:
        auth = self.register(self.client)
        workspace_id = auth["workspace"]["id"]
        project_response = self.client.post(
            f"/api/v1/workspaces/{workspace_id}/projects",
            headers=self.csrf_headers(auth),
            json={
                "name": "Clinic Media",
                "slug": "clinic-media",
                "description": "Unrelated project for clinic posts.",
                "language": "ru-RU",
                "content_domain": "clinic",
            },
        )
        self.assertEqual(project_response.status_code, 200, project_response.text)
        project = project_response.json()
        self.assertEqual(project["slug"], "clinic-media")

        rubric_response = self.client.post(
            f"/api/v1/projects/{project['id']}/rubrics",
            headers=self.csrf_headers(auth),
            json={
                "key": "doctor-post",
                "name": "Doctor post",
                "active": True,
                "editorial_limits": {"min_chars": 800, "max_chars": 1600},
                "ai_mode": "editor",
                "input_flow": [
                    {
                        "key": "doctor",
                        "label": "Doctor",
                        "type": "short_text",
                        "required": True,
                        "fact_locked": True,
                    },
                    {
                        "key": "faq",
                        "label": "FAQ",
                        "type": "repeatable_group",
                        "required": True,
                        "min_items": 1,
                        "fields": [
                            {
                                "key": "question",
                                "label": "Question",
                                "type": "short_text",
                                "required": True,
                                "fact_locked": True,
                            },
                            {
                                "key": "answer",
                                "label": "Answer",
                                "type": "long_text",
                                "required": True,
                                "fact_locked": True,
                            },
                        ],
                    },
                ],
                "generated_fields": ["hook", "cta", "master_text"],
            },
        )
        self.assertEqual(rubric_response.status_code, 200, rubric_response.text)
        rubric = rubric_response.json()
        self.assertEqual(rubric["active_version_number"], 1)
        self.assertEqual(asyncio.run(self._parent_versions(project["id"], rubric["id"])), (1, 1))

        schema_response = self.client.get(f"/api/v1/rubrics/{rubric['id']}/form-schema")
        self.assertEqual(schema_response.status_code, 200, schema_response.text)
        schema = schema_response.json()["json_schema"]
        self.assertEqual(schema["properties"]["faq"]["type"], "array")
        self.assertEqual(schema["properties"]["faq"]["minItems"], 1)

        updated = self.client.patch(
            f"/api/v1/rubrics/{rubric['id']}",
            headers=self.csrf_headers(auth),
            json={"editorial_limits": {"min_chars": 900, "max_chars": 1800}},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["active_version_number"], 2)
        self.assertEqual(asyncio.run(self._parent_versions(project["id"], rubric["id"])), (1, 2))
        self.assertEqual(asyncio.run(self._rubric_version_count(rubric["id"])), 2)

    def test_food_preset_import_is_idempotent_and_preserves_limits(self) -> None:
        auth = self.register(self.client, email="preset@example.com", workspace_name="Preset Workspace")
        workspace_id = auth["workspace"]["id"]
        first = self.client.post(
            f"/api/v1/workspaces/{workspace_id}/projects/from-preset",
            headers=self.csrf_headers(auth),
            json={"preset_key": "chto-poest-armavir"},
        )
        self.assertEqual(first.status_code, 200, first.text)
        self.assertTrue(first.json()["created"])
        self.assertEqual(first.json()["rubric_count"], 10)

        second = self.client.post(
            f"/api/v1/workspaces/{workspace_id}/projects/from-preset",
            headers=self.csrf_headers(auth),
            json={"preset_key": "chto-poest-armavir"},
        )
        self.assertEqual(second.status_code, 200, second.text)
        self.assertFalse(second.json()["created"])
        self.assertEqual(asyncio.run(self._project_count(workspace_id)), 1)
        version_count, max_chars = asyncio.run(self._preset_obzor_state(workspace_id))
        self.assertEqual(version_count, 1)
        self.assertEqual(max_chars, 4100)

    def test_cross_workspace_project_access_returns_404(self) -> None:
        owner_a = self.register(self.client, email="a@example.com", workspace_name="A Workspace")
        project = self.client.post(
            f"/api/v1/workspaces/{owner_a['workspace']['id']}/projects",
            headers=self.csrf_headers(owner_a),
            json={"name": "A project", "slug": "a-project"},
        ).json()
        other = TestClient(self.app, base_url="https://testserver")
        try:
            self.register(other, email="b@example.com", workspace_name="B Workspace")
            response = other.get(f"/api/v1/projects/{project['id']}")
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.json()["error"]["code"], "project_not_found")
        finally:
            other.close()

    def test_free_plan_project_limit_is_enforced(self) -> None:
        auth = self.register(self.client, email="limit@example.com", workspace_name="Limit Workspace")
        workspace_id = auth["workspace"]["id"]
        first = self.client.post(
            f"/api/v1/workspaces/{workspace_id}/projects",
            headers=self.csrf_headers(auth),
            json={"name": "First project", "slug": "first-project"},
        )
        self.assertEqual(first.status_code, 200, first.text)
        second = self.client.post(
            f"/api/v1/workspaces/{workspace_id}/projects",
            headers=self.csrf_headers(auth),
            json={"name": "Second project", "slug": "second-project"},
        )
        self.assertEqual(second.status_code, 402)
        self.assertEqual(second.json()["error"]["code"], "limit_exceeded")

    def test_mock_rubric_suggestion_is_draft_until_accepted(self) -> None:
        auth = self.register(self.client, email="suggest@example.com", workspace_name="Suggest Workspace")
        workspace_id = auth["workspace"]["id"]
        project = self.client.post(
            f"/api/v1/workspaces/{workspace_id}/projects",
            headers=self.csrf_headers(auth),
            json={"name": "Suggest project", "slug": "suggest-project"},
        ).json()
        suggestion = self.client.post(
            f"/api/v1/projects/{project['id']}/rubrics/generate-suggestions",
            headers=self.csrf_headers(auth),
            json={"prompt": "Build a Q&A rubric for local experts."},
        )
        self.assertEqual(suggestion.status_code, 200, suggestion.text)
        suggestion_payload = suggestion.json()
        self.assertEqual(suggestion_payload["status"], "draft")
        rubrics_before = self.client.get(f"/api/v1/projects/{project['id']}/rubrics").json()["rubrics"]
        self.assertEqual(rubrics_before, [])

        accepted = self.client.post(
            f"/api/v1/rubric-suggestions/{suggestion_payload['suggestion_id']}/accept",
            headers=self.csrf_headers(auth),
            json={"index": 0},
        )
        self.assertEqual(accepted.status_code, 200, accepted.text)
        rubrics_after = self.client.get(f"/api/v1/projects/{project['id']}/rubrics").json()["rubrics"]
        self.assertEqual(len(rubrics_after), 1)


if __name__ == "__main__":
    unittest.main()
