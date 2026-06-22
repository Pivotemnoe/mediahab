#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import sys
import tempfile
from pathlib import Path
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE / "services" / "api"))

from fastapi.testclient import TestClient  # noqa: E402

from app.db.base import Base, LockedFact  # noqa: E402
from app.db.session import get_session  # noqa: E402
from app.main import create_app  # noqa: E402


def main() -> int:
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "guided-form-api-mode.sqlite"
        engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
        session_local = async_sessionmaker(engine, expire_on_commit=False)
        asyncio.run(create_schema(engine))

        app = create_app()

        async def override_session():
            async with session_local() as session:
                yield session

        app.dependency_overrides[get_session] = override_session
        client = TestClient(app, base_url="https://testserver")
        try:
            run_smoke(client, session_local)
        finally:
            client.close()
            asyncio.run(engine.dispose())

    print("guided form API-mode smoke passed")
    return 0


async def create_schema(engine) -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)


def run_smoke(client: TestClient, session_local) -> None:
    auth = register(client)
    assert client.cookies.get("tmh_session"), "tmh_session cookie was not set"
    assert client.cookies.get("tmh_csrf"), "tmh_csrf cookie was not set"

    missing_csrf = client.post("/api/v1/workspaces", json={"name": "No CSRF"})
    assert missing_csrf.status_code == 403, missing_csrf.text
    assert missing_csrf.json()["error"]["code"] == "csrf_required", missing_csrf.text

    project, rubric = import_food_project(client, auth)
    content = create_content(client, auth, project["id"], rubric["id"])

    guided = client.get(f"/api/v1/content-items/{content['id']}/guided-form")
    assert guided.status_code == 200, guided.text
    form = guided.json()
    field_keys = [field["key"] for field in form["ui_schema"]["fields"]]
    assert "basic_info" in field_keys, field_keys
    assert "dishes" in field_keys, field_keys

    venue = client.put(
        f"/api/v1/content-items/{content['id']}/blocks/venue_name",
        headers=csrf_headers(auth),
        json={"value": {"text": "Старый город"}, "lock": True, "version": content["version"]},
    )
    assert venue.status_code == 200, venue.text
    assert venue.json()["is_locked"] is True, venue.text

    stale = client.patch(
        f"/api/v1/content-items/{content['id']}",
        headers=csrf_headers(auth),
        json={"title_internal": "Старая версия", "version": content["version"]},
    )
    assert stale.status_code == 409, stale.text
    assert stale.json()["error"]["code"] == "version_conflict", stale.text

    current = client.get(f"/api/v1/content-items/{content['id']}")
    assert current.status_code == 200, current.text
    stale_dish = client.post(
        f"/api/v1/content-items/{content['id']}/repeatable-groups/dishes",
        headers=csrf_headers(auth),
        json={
            "version": content["version"],
            "lock": True,
            "values": {
                "name": {"text": "Старая уха"},
                "price": {"amount": 320, "currency": "RUB"},
            },
        },
    )
    assert stale_dish.status_code == 409, stale_dish.text
    assert stale_dish.json()["error"]["code"] == "version_conflict", stale_dish.text

    dish = client.post(
        f"/api/v1/content-items/{content['id']}/repeatable-groups/dishes",
        headers=csrf_headers(auth),
        json={
            "version": current.json()["version"],
            "lock": True,
            "values": {
                "name": {"text": "Уха"},
                "price": {"amount": 350, "currency": "RUB"},
                "observations": {"text": "Рыбный вкус нормальный."},
            },
        },
    )
    assert dish.status_code == 200, dish.text
    assert {block["group_index"] for block in dish.json()["blocks"]} == {0}, dish.text

    locked_fact_count = asyncio.run(count_locked_facts(session_local, content["id"]))
    assert locked_fact_count >= 4, locked_fact_count


def register(client: TestClient) -> dict[str, object]:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "api-mode-smoke@example.com",
            "password": "strong-password-123",
            "display_name": "API Mode Smoke",
            "workspace_name": "API Mode Workspace",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def csrf_headers(auth: dict[str, object]) -> dict[str, str]:
    return {"X-CSRF-Token": str(auth["csrf_token"])}


def import_food_project(
    client: TestClient,
    auth: dict[str, object],
) -> tuple[dict[str, object], dict[str, object]]:
    imported = client.post(
        f"/api/v1/workspaces/{auth['workspace']['id']}/projects/from-preset",
        headers=csrf_headers(auth),
        json={"preset_key": "chto-poest-armavir"},
    )
    assert imported.status_code == 200, imported.text
    project = imported.json()["project"]

    rubrics = client.get(f"/api/v1/projects/{project['id']}/rubrics")
    assert rubrics.status_code == 200, rubrics.text
    rubric = next(item for item in rubrics.json()["rubrics"] if item["slug"] == "obzor-nedeli")
    return project, rubric


def create_content(
    client: TestClient,
    auth: dict[str, object],
    project_id: str,
    rubric_id: str,
) -> dict[str, object]:
    created = client.post(
        f"/api/v1/projects/{project_id}/content-items",
        headers=csrf_headers(auth),
        json={"rubric_id": rubric_id, "title_internal": "API-mode smoke"},
    )
    assert created.status_code == 200, created.text
    return created.json()


async def count_locked_facts(session_local, content_id: str) -> int:
    async with session_local() as session:
        return int(
            await session.scalar(
                select(func.count()).select_from(LockedFact).where(LockedFact.content_item_id == UUID(content_id))
            )
            or 0
        )


if __name__ == "__main__":
    raise SystemExit(main())
