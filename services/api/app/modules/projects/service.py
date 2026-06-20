from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import (
    InputSchema,
    Project,
    ProjectVersion,
    Rubric,
    RubricVersion,
    utc_now,
)
from app.modules.auth.security import slugify
from app.modules.billing.service import entitlement_value
from app.modules.projects.schema_builder import checksum, input_flow_to_schema


@dataclass
class ProjectContext:
    project: Project
    version: ProjectVersion


@dataclass
class RubricContext:
    rubric: Rubric
    version: RubricVersion
    input_schema: InputSchema


async def active_project_count(session: AsyncSession, workspace_id: UUID) -> int:
    return int(
        await session.scalar(
            select(func.count())
            .select_from(Project)
            .where(
                Project.workspace_id == workspace_id,
                Project.deleted_at.is_(None),
                Project.status == "active",
            )
        )
        or 0
    )


async def ensure_project_limit(session: AsyncSession, workspace_id: UUID) -> tuple[bool, dict[str, Any]]:
    limit = int(await entitlement_value(session, workspace_id, "projects.max", 1))
    used = await active_project_count(session, workspace_id)
    return used < limit, {"entitlement": "projects.max", "limit": limit, "used": used}


async def unique_project_slug(session: AsyncSession, workspace_id: UUID, value: str) -> str:
    base = slugify(value)
    candidate = base
    index = 1
    while await session.scalar(
        select(Project.id).where(Project.workspace_id == workspace_id, Project.slug == candidate)
    ):
        index += 1
        candidate = f"{base}-{index}"
    return candidate


async def next_project_version_number(session: AsyncSession, project_id: UUID) -> int:
    latest = await session.scalar(
        select(func.max(ProjectVersion.version_number)).where(ProjectVersion.project_id == project_id)
    )
    return int(latest or 0) + 1


async def next_rubric_version_number(session: AsyncSession, rubric_id: UUID) -> int:
    latest = await session.scalar(
        select(func.max(RubricVersion.version_number)).where(RubricVersion.rubric_id == rubric_id)
    )
    return int(latest or 0) + 1


async def get_active_project(session: AsyncSession, project_id: UUID) -> ProjectContext | None:
    row = (
        await session.execute(
            select(Project, ProjectVersion)
            .join(ProjectVersion, ProjectVersion.id == Project.active_version_id)
            .where(Project.id == project_id, Project.deleted_at.is_(None))
        )
    ).first()
    if row is None:
        return None
    project, version = row
    return ProjectContext(project=project, version=version)


async def get_active_rubric(session: AsyncSession, rubric_id: UUID) -> RubricContext | None:
    row = (
        await session.execute(
            select(Rubric, RubricVersion, InputSchema)
            .join(RubricVersion, RubricVersion.id == Rubric.active_version_id)
            .join(InputSchema, InputSchema.id == RubricVersion.input_schema_id)
            .where(Rubric.id == rubric_id)
        )
    ).first()
    if row is None:
        return None
    rubric, version, input_schema = row
    return RubricContext(rubric=rubric, version=version, input_schema=input_schema)


def project_version_payload(data: dict[str, Any]) -> dict[str, Any]:
    ai_policy = data.get("default_ai_policy") or {}
    return {
        "name": data["name"],
        "description": data.get("description"),
        "language": data.get("locale", data.get("language", "ru-RU")),
        "content_domain": data.get("content_domain"),
        "tone_config": {
            "policy": ai_policy,
            "voice": data.get("voice_and_tone", {}),
        },
        "ai_mode_default": ai_policy.get("mode", data.get("ai_mode_default", "editor")),
        "editing_strength": ai_policy.get("edit_strength_percent", data.get("editing_strength", {})),
        "humor_config": {"level": ai_policy.get("humor_level")},
        "cta_config": data.get("cta_config", {}),
        "provider_preferences": data.get("provider_preferences", {}),
        "character_count_policy": data.get(
            "character_count_policy",
            {"unit": "unicode_code_points"},
        ),
        "branding": data.get("branding", {}),
        "connected_platform_types": data.get("connected_platform_types", {}),
        "example_retrieval": data.get("example_retrieval", {}),
        "source_payload": data,
    }


async def create_project_with_version(
    session: AsyncSession,
    workspace_id: UUID,
    actor_user_id: UUID,
    data: dict[str, Any],
    source_kind: str = "manual",
    slug: str | None = None,
    preset_key: str | None = None,
) -> ProjectContext:
    now = utc_now()
    project = Project(
        id=uuid4(),
        workspace_id=workspace_id,
        slug=slug or await unique_project_slug(session, workspace_id, data["name"]),
        preset_key=preset_key or data.get("preset_key"),
        status=data.get("status", "active"),
        created_by=actor_user_id,
        created_at=now,
        updated_at=now,
        version=1,
    )
    session.add(project)
    await session.flush()
    version = await create_project_version(
        session, project, actor_user_id, data, source_kind=source_kind, force_number=1
    )
    project.active_version_id = version.id
    await session.flush()
    return ProjectContext(project=project, version=version)


async def create_project_version(
    session: AsyncSession,
    project: Project,
    actor_user_id: UUID,
    data: dict[str, Any],
    source_kind: str = "manual",
    force_number: int | None = None,
) -> ProjectVersion:
    payload = project_version_payload(data)
    version_checksum = checksum(payload)
    current = await session.scalar(
        select(ProjectVersion).where(
            ProjectVersion.project_id == project.id,
            ProjectVersion.checksum == version_checksum,
        )
    )
    if current is not None:
        project.active_version_id = current.id
        return current
    version = ProjectVersion(
        id=uuid4(),
        workspace_id=project.workspace_id,
        project_id=project.id,
        version_number=force_number or await next_project_version_number(session, project.id),
        checksum=version_checksum,
        created_by=actor_user_id,
        created_at=utc_now(),
        source_kind=source_kind,
        **payload,
    )
    session.add(version)
    await session.flush()
    project.active_version_id = version.id
    project.updated_at = utc_now()
    if force_number is None:
        project.version += 1
    return version


def rubric_version_payload(data: dict[str, Any]) -> dict[str, Any]:
    limits = data.get("editorial_limits") or {}
    input_flow = data.get("input_flow")
    template = data.get("input_flow_template")
    json_schema, ui_schema = input_flow_to_schema(data["key"], input_flow, template)
    return {
        "name": data["name"],
        "description": data.get("description"),
        "json_schema": json_schema,
        "ui_schema": ui_schema,
        "ai_mode": data.get("ai_mode", "editor"),
        "editorial_min_chars": limits.get("min_chars"),
        "editorial_max_chars": limits.get("max_chars"),
        "generation_pipeline": {
            "input_flow": input_flow,
            "input_flow_template": template,
        },
        "media_policy": data.get("media_policy", {}),
        "rating_policy": data.get("rating_policy", {}),
        "generated_fields": data.get("generated_fields", []),
        "platform_overrides": data.get("platform_overrides", {}),
        "source_payload": data,
    }


async def get_or_create_input_schema(
    session: AsyncSession,
    workspace_id: UUID,
    json_schema: dict[str, Any],
    ui_schema: dict[str, Any],
) -> InputSchema:
    schema_checksum = checksum({"json_schema": json_schema, "ui_schema": ui_schema})
    existing = await session.scalar(
        select(InputSchema).where(
            InputSchema.workspace_id == workspace_id,
            InputSchema.checksum == schema_checksum,
        )
    )
    if existing is not None:
        return existing
    schema = InputSchema(
        id=uuid4(),
        workspace_id=workspace_id,
        schema_version="1.0",
        json_schema=json_schema,
        ui_schema=ui_schema,
        checksum=schema_checksum,
        created_at=utc_now(),
    )
    session.add(schema)
    await session.flush()
    return schema


async def create_rubric_with_version(
    session: AsyncSession,
    project: Project,
    actor_user_id: UUID,
    data: dict[str, Any],
    sort_order: int,
) -> RubricContext:
    now = utc_now()
    rubric = Rubric(
        id=uuid4(),
        workspace_id=project.workspace_id,
        project_id=project.id,
        slug=data["key"],
        status="archived" if data.get("archived") or not data.get("active", True) else "active",
        sort_order=sort_order,
        created_at=now,
        updated_at=now,
        version=1,
    )
    session.add(rubric)
    await session.flush()
    version = await create_rubric_version(
        session, rubric, actor_user_id, data, force_number=1
    )
    rubric.active_version_id = version.id
    input_schema = await session.get(InputSchema, version.input_schema_id)
    assert input_schema is not None
    return RubricContext(rubric=rubric, version=version, input_schema=input_schema)


async def create_rubric_version(
    session: AsyncSession,
    rubric: Rubric,
    actor_user_id: UUID,
    data: dict[str, Any],
    force_number: int | None = None,
) -> RubricVersion:
    payload = rubric_version_payload(data)
    input_schema = await get_or_create_input_schema(
        session, rubric.workspace_id, payload.pop("json_schema"), payload["ui_schema"]
    )
    version_checksum = checksum(payload | {"input_schema_checksum": input_schema.checksum})
    current = await session.scalar(
        select(RubricVersion).where(
            RubricVersion.rubric_id == rubric.id,
            RubricVersion.checksum == version_checksum,
        )
    )
    if current is not None:
        rubric.active_version_id = current.id
        return current
    version = RubricVersion(
        id=uuid4(),
        workspace_id=rubric.workspace_id,
        rubric_id=rubric.id,
        version_number=force_number or await next_rubric_version_number(session, rubric.id),
        input_schema_id=input_schema.id,
        checksum=version_checksum,
        created_by=actor_user_id,
        created_at=utc_now(),
        **payload,
    )
    session.add(version)
    await session.flush()
    rubric.active_version_id = version.id
    rubric.updated_at = utc_now()
    if force_number is None:
        rubric.version += 1
    return version
