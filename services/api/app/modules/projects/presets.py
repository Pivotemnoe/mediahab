from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Project, Rubric
from app.modules.projects.schema_builder import (
    load_yaml,
    validate_project_payload,
    validate_rubric_payload,
)
from app.modules.projects.service import (
    ProjectContext,
    create_project_version,
    create_project_with_version,
    create_rubric_version,
    create_rubric_with_version,
)


SUPPORTED_PRESETS = {"chto-poest-armavir": "presets/chto-poest-armavir"}


def load_preset_bundle(preset_key: str) -> dict[str, Any]:
    if preset_key not in SUPPORTED_PRESETS:
        raise KeyError(preset_key)
    base = SUPPORTED_PRESETS[preset_key]
    project = load_yaml(f"{base}/project.yaml")
    rubrics = load_yaml(f"{base}/rubrics.yaml")
    return {"project": project, "rubrics": rubrics.get("rubrics", [])}


def validate_bundle(project: dict[str, Any], rubrics: list[dict[str, Any]]) -> list[str]:
    errors = validate_project_payload(project)
    for rubric in rubrics:
        errors.extend(validate_rubric_payload({"schema_version": "1.0", **rubric}))
    return errors


async def import_project_bundle(
    session: AsyncSession,
    workspace_id: UUID,
    actor_user_id: UUID,
    project_data: dict[str, Any],
    rubrics: list[dict[str, Any]],
    source_kind: str,
    preset_key: str | None = None,
) -> tuple[ProjectContext, list[Rubric], bool]:
    slug = project_data["slug"]
    lookup = [
        Project.workspace_id == workspace_id,
        Project.deleted_at.is_(None),
    ]
    if preset_key or project_data.get("preset_key"):
        lookup.append(Project.preset_key == (preset_key or project_data.get("preset_key")))
    else:
        lookup.append(Project.slug == slug)
    project = await session.scalar(select(Project).where(*lookup))
    created = False
    if project is None:
        ctx = await create_project_with_version(
            session,
            workspace_id,
            actor_user_id,
            project_data,
            source_kind=source_kind,
            slug=slug,
            preset_key=preset_key or project_data.get("preset_key"),
        )
        project = ctx.project
        created = True
    else:
        version = await create_project_version(
            session, project, actor_user_id, project_data, source_kind=source_kind
        )
        ctx = ProjectContext(project=project, version=version)

    imported_rubrics: list[Rubric] = []
    for index, raw_rubric in enumerate(rubrics):
        rubric_data = {"schema_version": "1.0", **raw_rubric}
        rubric = await session.scalar(
            select(Rubric).where(
                Rubric.project_id == project.id,
                Rubric.slug == rubric_data["key"],
            )
        )
        if rubric is None:
            rubric_ctx = await create_rubric_with_version(
                session,
                project,
                actor_user_id,
                rubric_data,
                sort_order=index,
            )
            rubric = rubric_ctx.rubric
        else:
            rubric.sort_order = index
            rubric.status = (
                "archived"
                if rubric_data.get("archived") or not rubric_data.get("active", True)
                else "active"
            )
            await create_rubric_version(session, rubric, actor_user_id, rubric_data)
        imported_rubrics.append(rubric)
    return ctx, imported_rubrics, created
