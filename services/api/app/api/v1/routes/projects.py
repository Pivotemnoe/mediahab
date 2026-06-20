from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import (
    InputSchema,
    Project,
    ProjectVersion,
    Rubric,
    RubricSuggestion,
    RubricVersion,
    utc_now,
)
from app.db.session import get_session
from app.modules.auth.dependencies import (
    Actor,
    get_current_actor,
    require_csrf,
    require_role,
    require_workspace_membership,
)
from app.modules.auth.security import slugify
from app.modules.projects.presets import (
    import_project_bundle,
    load_preset_bundle,
    validate_bundle,
)
from app.modules.projects.schema_builder import validate_rubric_payload
from app.modules.projects.service import (
    create_project_version,
    create_project_with_version,
    create_rubric_version,
    create_rubric_with_version,
    ensure_project_limit,
    get_active_project,
    get_active_rubric,
    unique_project_slug,
)
from app.modules.shared.errors import api_error

router = APIRouter()


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    slug: str | None = Field(default=None, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    language: str = Field(default="ru-RU", min_length=2, max_length=20)
    content_domain: str | None = None
    ai_mode_default: str = Field(default="editor", pattern="^(editor|author|adapter)$")
    tone_config: dict[str, Any] = Field(default_factory=dict)
    editing_strength: dict[str, Any] = Field(default_factory=dict)
    humor_config: dict[str, Any] = Field(default_factory=dict)
    cta_config: dict[str, Any] = Field(default_factory=dict)
    provider_preferences: dict[str, Any] = Field(default_factory=dict)
    character_count_policy: dict[str, Any] = Field(
        default_factory=lambda: {"unit": "unicode_code_points"}
    )


class ProjectPatchRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    language: str | None = Field(default=None, min_length=2, max_length=20)
    content_domain: str | None = None
    ai_mode_default: str | None = Field(default=None, pattern="^(editor|author|adapter)$")
    tone_config: dict[str, Any] | None = None
    editing_strength: dict[str, Any] | None = None
    humor_config: dict[str, Any] | None = None
    cta_config: dict[str, Any] | None = None
    provider_preferences: dict[str, Any] | None = None
    character_count_policy: dict[str, Any] | None = None


class ProjectFromPresetRequest(BaseModel):
    preset_key: str = Field(default="chto-poest-armavir", pattern="^[a-z0-9][a-z0-9-]*$")


class ProjectImportRequest(BaseModel):
    project: dict[str, Any]
    rubrics: list[dict[str, Any]] = Field(default_factory=list)


class ProjectCloneRequest(BaseModel):
    name: str | None = Field(default=None, max_length=160)
    slug: str | None = Field(default=None, max_length=160)


class ProjectVersionOut(BaseModel):
    id: UUID
    version_number: int
    name: str
    description: str | None
    language: str
    content_domain: str | None
    ai_mode_default: str
    checksum: str
    created_at: str


class ProjectOut(BaseModel):
    id: UUID
    workspace_id: UUID
    slug: str
    preset_key: str | None
    status: str
    active_version_id: UUID
    active_version_number: int
    name: str
    description: str | None
    language: str
    content_domain: str | None
    rubric_count: int = 0


class ProjectListResponse(BaseModel):
    projects: list[ProjectOut]


class ProjectImportResponse(BaseModel):
    project: ProjectOut
    created: bool
    rubric_count: int


class RubricEditorialLimits(BaseModel):
    min_chars: int | None = None
    max_chars: int | None = None


class RubricCreateRequest(BaseModel):
    key: str = Field(pattern="^[a-z0-9][a-z0-9-]*$")
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    active: bool = True
    archived: bool = False
    editorial_limits: RubricEditorialLimits
    ai_mode: str = Field(default="editor", pattern="^(editor|author|adapter)$")
    input_flow: list[dict[str, Any]] | None = None
    input_flow_template: str | None = None
    generated_fields: list[str] = Field(default_factory=list)
    platform_overrides: dict[str, Any] = Field(default_factory=dict)


class RubricPatchRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    editorial_limits: RubricEditorialLimits | None = None
    ai_mode: str | None = Field(default=None, pattern="^(editor|author|adapter)$")
    input_flow: list[dict[str, Any]] | None = None
    input_flow_template: str | None = None
    generated_fields: list[str] | None = None
    platform_overrides: dict[str, Any] | None = None


class RubricOut(BaseModel):
    id: UUID
    project_id: UUID
    workspace_id: UUID
    slug: str
    status: str
    sort_order: int
    active_version_id: UUID
    active_version_number: int
    name: str
    description: str | None
    ai_mode: str
    editorial_min_chars: int | None
    editorial_max_chars: int | None
    generated_fields: list[str]
    input_schema_id: UUID


class RubricListResponse(BaseModel):
    rubrics: list[RubricOut]


class SchemaResponse(BaseModel):
    rubric_id: UUID
    rubric_version_id: UUID
    json_schema: dict[str, Any]
    ui_schema: dict[str, Any]


class SchemaValidationRequest(BaseModel):
    rubric: dict[str, Any]


class SchemaValidationResponse(BaseModel):
    valid: bool
    errors: list[str]


class VersionsResponse(BaseModel):
    versions: list[ProjectVersionOut]


class RubricVersionsResponse(BaseModel):
    versions: list[dict[str, Any]]


class SuggestionRequest(BaseModel):
    workspace_id: UUID | None = None
    prompt: str = Field(min_length=1, max_length=5000)


class SuggestionResponse(BaseModel):
    suggestion_id: UUID
    status: str
    suggestions: list[dict[str, Any]]


class AcceptSuggestionRequest(BaseModel):
    index: int = Field(default=0, ge=0)


class MessageResponse(BaseModel):
    status: str
    message: str


def project_data_from_create(payload: ProjectCreateRequest) -> dict[str, Any]:
    return {
        "schema_version": "1.0",
        "name": payload.name,
        "slug": payload.slug or slugify(payload.name),
        "status": "active",
        "locale": payload.language,
        "description": payload.description,
        "content_domain": payload.content_domain,
        "default_ai_policy": {"mode": payload.ai_mode_default},
        "voice_and_tone": payload.tone_config,
        "editing_strength": payload.editing_strength,
        "humor_config": payload.humor_config,
        "cta_config": payload.cta_config,
        "provider_preferences": payload.provider_preferences,
        "character_count_policy": payload.character_count_policy,
    }


def project_out(project: Project, version: ProjectVersion, rubric_count: int = 0) -> ProjectOut:
    if project.active_version_id is None:
        raise RuntimeError("project has no active version")
    return ProjectOut(
        id=project.id,
        workspace_id=project.workspace_id,
        slug=project.slug,
        preset_key=project.preset_key,
        status=project.status,
        active_version_id=project.active_version_id,
        active_version_number=version.version_number,
        name=version.name,
        description=version.description,
        language=version.language,
        content_domain=version.content_domain,
        rubric_count=rubric_count,
    )


def rubric_out(rubric: Rubric, version: RubricVersion) -> RubricOut:
    if rubric.active_version_id is None:
        raise RuntimeError("rubric has no active version")
    return RubricOut(
        id=rubric.id,
        project_id=rubric.project_id,
        workspace_id=rubric.workspace_id,
        slug=rubric.slug,
        status=rubric.status,
        sort_order=rubric.sort_order,
        active_version_id=rubric.active_version_id,
        active_version_number=version.version_number,
        name=version.name,
        description=version.description,
        ai_mode=version.ai_mode,
        editorial_min_chars=version.editorial_min_chars,
        editorial_max_chars=version.editorial_max_chars,
        generated_fields=list(version.generated_fields or []),
        input_schema_id=version.input_schema_id,
    )


async def project_for_actor(
    project_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[Project, ProjectVersion]:
    ctx = await get_active_project(db, project_id)
    if ctx is None:
        raise api_error(404, "project_not_found", "Project not found.", request=request)
    try:
        await require_workspace_membership(ctx.project.workspace_id, request, actor, db)
    except Exception as exc:
        raise api_error(404, "project_not_found", "Project not found.", request=request) from exc
    return ctx.project, ctx.version


async def mutable_project_for_actor(
    project_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[Project, ProjectVersion]:
    project, version = await project_for_actor(project_id, request, actor, db)
    _, membership = await require_workspace_membership(project.workspace_id, request, actor, db)
    require_role(membership, {"owner", "admin"}, request)
    return project, version


async def rubric_for_actor(
    rubric_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[Rubric, RubricVersion, InputSchema]:
    ctx = await get_active_rubric(db, rubric_id)
    if ctx is None:
        raise api_error(404, "rubric_not_found", "Rubric not found.", request=request)
    try:
        await require_workspace_membership(ctx.rubric.workspace_id, request, actor, db)
    except Exception as exc:
        raise api_error(404, "rubric_not_found", "Rubric not found.", request=request) from exc
    return ctx.rubric, ctx.version, ctx.input_schema


async def mutable_rubric_for_actor(
    rubric_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[Rubric, RubricVersion, InputSchema]:
    rubric, version, input_schema = await rubric_for_actor(rubric_id, request, actor, db)
    _, membership = await require_workspace_membership(rubric.workspace_id, request, actor, db)
    require_role(membership, {"owner", "admin"}, request)
    return rubric, version, input_schema


async def rubric_count(db: AsyncSession, project_id: UUID) -> int:
    from sqlalchemy import func

    return int(
        await db.scalar(select(func.count()).select_from(Rubric).where(Rubric.project_id == project_id))
        or 0
    )


@router.get("/workspaces/{workspace_id}/projects", response_model=ProjectListResponse)
async def list_projects(
    workspace_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> ProjectListResponse:
    await require_workspace_membership(workspace_id, request, actor, db)
    rows = await db.execute(
        select(Project, ProjectVersion)
        .join(ProjectVersion, ProjectVersion.id == Project.active_version_id)
        .where(Project.workspace_id == workspace_id, Project.deleted_at.is_(None))
        .order_by(Project.created_at)
    )
    projects = [
        project_out(project, version, await rubric_count(db, project.id))
        for project, version in rows.all()
    ]
    return ProjectListResponse(projects=projects)


@router.post("/workspaces/{workspace_id}/projects", response_model=ProjectOut)
async def create_project(
    workspace_id: UUID,
    payload: ProjectCreateRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> ProjectOut:
    _, membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(membership, {"owner", "admin"}, request)
    allowed, details = await ensure_project_limit(db, workspace_id)
    if not allowed:
        raise api_error(402, "limit_exceeded", "Project limit reached.", details, request=request)
    data = project_data_from_create(payload)
    slug = slugify(payload.slug or payload.name)
    if await db.scalar(select(Project.id).where(Project.workspace_id == workspace_id, Project.slug == slug)):
        raise api_error(409, "project_slug_exists", "Project slug already exists.", request=request)
    ctx = await create_project_with_version(db, workspace_id, actor.user.id, data, slug=slug)
    await db.commit()
    return project_out(ctx.project, ctx.version, 0)


@router.post("/workspaces/{workspace_id}/projects/from-preset", response_model=ProjectImportResponse)
async def create_project_from_preset(
    workspace_id: UUID,
    payload: ProjectFromPresetRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> ProjectImportResponse:
    _, membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(membership, {"owner", "admin"}, request)
    try:
        bundle = load_preset_bundle(payload.preset_key)
    except KeyError as exc:
        raise api_error(404, "preset_not_found", "Preset not found.", request=request) from exc

    existing = await db.scalar(
        select(Project).where(Project.workspace_id == workspace_id, Project.preset_key == payload.preset_key)
    )
    if existing is None:
        allowed, details = await ensure_project_limit(db, workspace_id)
        if not allowed:
            raise api_error(402, "limit_exceeded", "Project limit reached.", details, request=request)
    errors = validate_bundle(bundle["project"], bundle["rubrics"])
    if errors:
        raise api_error(422, "preset_invalid", "Preset failed schema validation.", {"errors": errors}, request=request)
    ctx, rubrics, created = await import_project_bundle(
        db,
        workspace_id,
        actor.user.id,
        bundle["project"],
        bundle["rubrics"],
        source_kind="preset",
        preset_key=payload.preset_key,
    )
    await db.commit()
    return ProjectImportResponse(
        project=project_out(ctx.project, ctx.version, len(rubrics)),
        created=created,
        rubric_count=len(rubrics),
    )


@router.post("/workspaces/{workspace_id}/projects/import", response_model=ProjectImportResponse)
async def import_project(
    workspace_id: UUID,
    payload: ProjectImportRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> ProjectImportResponse:
    _, membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(membership, {"owner", "admin"}, request)
    existing = await db.scalar(
        select(Project).where(Project.workspace_id == workspace_id, Project.slug == payload.project.get("slug"))
    )
    if existing is None:
        allowed, details = await ensure_project_limit(db, workspace_id)
        if not allowed:
            raise api_error(402, "limit_exceeded", "Project limit reached.", details, request=request)
    errors = validate_bundle(payload.project, payload.rubrics)
    if errors:
        raise api_error(422, "project_import_invalid", "Project import failed validation.", {"errors": errors}, request=request)
    ctx, rubrics, created = await import_project_bundle(
        db,
        workspace_id,
        actor.user.id,
        payload.project,
        payload.rubrics,
        source_kind="import",
    )
    await db.commit()
    return ProjectImportResponse(
        project=project_out(ctx.project, ctx.version, len(rubrics)),
        created=created,
        rubric_count=len(rubrics),
    )


@router.post("/projects/generate-suggestions", response_model=SuggestionResponse)
async def generate_project_suggestions(
    payload: SuggestionRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> SuggestionResponse:
    if payload.workspace_id is None:
        raise api_error(422, "workspace_required", "workspace_id is required.", request=request)
    _, membership = await require_workspace_membership(payload.workspace_id, request, actor, db)
    require_role(membership, {"owner", "admin"}, request)
    suggestions = mock_rubric_suggestions(payload.prompt)
    suggestion = RubricSuggestion(
        workspace_id=payload.workspace_id,
        project_id=None,
        prompt=payload.prompt,
        suggestions_json=suggestions,
        status="draft",
        created_by=actor.user.id,
        created_at=utc_now(),
    )
    db.add(suggestion)
    await db.commit()
    return SuggestionResponse(suggestion_id=suggestion.id, status=suggestion.status, suggestions=suggestions)


@router.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> ProjectOut:
    project, version = await project_for_actor(project_id, request, actor, db)
    return project_out(project, version, await rubric_count(db, project.id))


@router.patch("/projects/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: UUID,
    payload: ProjectPatchRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> ProjectOut:
    project, version = await mutable_project_for_actor(project_id, request, actor, db)
    data = dict(version.source_payload or {})
    patch = payload.model_dump(exclude_none=True)
    if "language" in patch:
        data["locale"] = patch.pop("language")
    if "ai_mode_default" in patch:
        data.setdefault("default_ai_policy", {})["mode"] = patch.pop("ai_mode_default")
    data.update(patch)
    data["slug"] = project.slug
    data["status"] = project.status
    new_version = await create_project_version(db, project, actor.user.id, data, source_kind="manual")
    await db.commit()
    return project_out(project, new_version, await rubric_count(db, project.id))


@router.post("/projects/{project_id}/clone", response_model=ProjectOut)
async def clone_project(
    project_id: UUID,
    payload: ProjectCloneRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> ProjectOut:
    project, version = await mutable_project_for_actor(project_id, request, actor, db)
    allowed, details = await ensure_project_limit(db, project.workspace_id)
    if not allowed:
        raise api_error(402, "limit_exceeded", "Project limit reached.", details, request=request)
    data = dict(version.source_payload or {})
    data["name"] = payload.name or f"{version.name} copy"
    data["slug"] = payload.slug or await unique_project_slug(db, project.workspace_id, data["name"])
    data.pop("preset_key", None)
    ctx = await create_project_with_version(
        db,
        project.workspace_id,
        actor.user.id,
        data,
        source_kind="clone",
        slug=slugify(data["slug"]),
        preset_key=None,
    )
    rows = await db.execute(
        select(Rubric, RubricVersion)
        .join(RubricVersion, RubricVersion.id == Rubric.active_version_id)
        .where(Rubric.project_id == project.id)
        .order_by(Rubric.sort_order)
    )
    for rubric, rubric_version in rows.all():
        rubric_data = dict(rubric_version.source_payload or {})
        await create_rubric_with_version(
            db, ctx.project, actor.user.id, rubric_data, rubric.sort_order
        )
    await db.commit()
    return project_out(ctx.project, ctx.version, await rubric_count(db, ctx.project.id))


@router.post("/projects/{project_id}/export", response_model=ProjectImportRequest)
async def export_project(
    project_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> ProjectImportRequest:
    project, version = await project_for_actor(project_id, request, actor, db)
    rows = await db.execute(
        select(Rubric, RubricVersion)
        .join(RubricVersion, RubricVersion.id == Rubric.active_version_id)
        .where(Rubric.project_id == project.id)
        .order_by(Rubric.sort_order)
    )
    return ProjectImportRequest(
        project=dict(version.source_payload or {}),
        rubrics=[dict(rubric_version.source_payload or {}) for _, rubric_version in rows.all()],
    )


@router.post("/projects/{project_id}/archive", response_model=MessageResponse)
async def archive_project(
    project_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    project, _ = await mutable_project_for_actor(project_id, request, actor, db)
    project.status = "archived"
    project.updated_at = utc_now()
    await db.commit()
    return MessageResponse(status="ok", message="Project archived.")


@router.get("/projects/{project_id}/versions", response_model=VersionsResponse)
async def list_project_versions(
    project_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> VersionsResponse:
    project, _ = await project_for_actor(project_id, request, actor, db)
    versions = await db.scalars(
        select(ProjectVersion).where(ProjectVersion.project_id == project.id).order_by(ProjectVersion.version_number)
    )
    return VersionsResponse(
        versions=[
            ProjectVersionOut(
                id=version.id,
                version_number=version.version_number,
                name=version.name,
                description=version.description,
                language=version.language,
                content_domain=version.content_domain,
                ai_mode_default=version.ai_mode_default,
                checksum=version.checksum,
                created_at=version.created_at.isoformat(),
            )
            for version in versions
        ]
    )


@router.get("/projects/{project_id}/versions/{version_id}", response_model=ProjectVersionOut)
async def get_project_version(
    project_id: UUID,
    version_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> ProjectVersionOut:
    project, _ = await project_for_actor(project_id, request, actor, db)
    version = await db.get(ProjectVersion, version_id)
    if version is None or version.project_id != project.id:
        raise api_error(404, "project_version_not_found", "Project version not found.", request=request)
    return ProjectVersionOut(
        id=version.id,
        version_number=version.version_number,
        name=version.name,
        description=version.description,
        language=version.language,
        content_domain=version.content_domain,
        ai_mode_default=version.ai_mode_default,
        checksum=version.checksum,
        created_at=version.created_at.isoformat(),
    )


@router.get("/projects/{project_id}/rubrics", response_model=RubricListResponse)
async def list_rubrics(
    project_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> RubricListResponse:
    project, _ = await project_for_actor(project_id, request, actor, db)
    rows = await db.execute(
        select(Rubric, RubricVersion)
        .join(RubricVersion, RubricVersion.id == Rubric.active_version_id)
        .where(Rubric.project_id == project.id)
        .order_by(Rubric.sort_order)
    )
    return RubricListResponse(rubrics=[rubric_out(rubric, version) for rubric, version in rows.all()])


@router.post("/projects/{project_id}/rubrics", response_model=RubricOut)
async def create_rubric(
    project_id: UUID,
    payload: RubricCreateRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> RubricOut:
    project, _ = await mutable_project_for_actor(project_id, request, actor, db)
    if await db.scalar(select(Rubric.id).where(Rubric.project_id == project.id, Rubric.slug == payload.key)):
        raise api_error(409, "rubric_slug_exists", "Rubric slug already exists.", request=request)
    data = {"schema_version": "1.0", **payload.model_dump()}
    errors = validate_rubric_payload(data)
    if errors:
        raise api_error(422, "rubric_invalid", "Rubric schema is invalid.", {"errors": errors}, request=request)
    existing_count = await rubric_count(db, project.id)
    ctx = await create_rubric_with_version(db, project, actor.user.id, data, existing_count)
    await db.commit()
    return rubric_out(ctx.rubric, ctx.version)


@router.post("/projects/{project_id}/rubrics/generate-suggestions", response_model=SuggestionResponse)
async def generate_rubric_suggestions(
    project_id: UUID,
    payload: SuggestionRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> SuggestionResponse:
    project, _ = await mutable_project_for_actor(project_id, request, actor, db)
    suggestions = mock_rubric_suggestions(payload.prompt)
    suggestion = RubricSuggestion(
        workspace_id=project.workspace_id,
        project_id=project.id,
        prompt=payload.prompt,
        suggestions_json=suggestions,
        status="draft",
        created_by=actor.user.id,
        created_at=utc_now(),
    )
    db.add(suggestion)
    await db.commit()
    return SuggestionResponse(suggestion_id=suggestion.id, status=suggestion.status, suggestions=suggestions)


@router.get("/rubrics/{rubric_id}", response_model=RubricOut)
async def get_rubric(
    rubric_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> RubricOut:
    rubric, version, _ = await rubric_for_actor(rubric_id, request, actor, db)
    return rubric_out(rubric, version)


@router.patch("/rubrics/{rubric_id}", response_model=RubricOut)
async def update_rubric(
    rubric_id: UUID,
    payload: RubricPatchRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> RubricOut:
    rubric, version, _ = await mutable_rubric_for_actor(rubric_id, request, actor, db)
    data = dict(version.source_payload or {})
    patch = payload.model_dump(exclude_none=True)
    if "editorial_limits" in patch and patch["editorial_limits"] is not None:
        data["editorial_limits"] = patch.pop("editorial_limits")
    data.update(patch)
    data["key"] = rubric.slug
    data["active"] = rubric.status == "active"
    data["archived"] = rubric.status == "archived"
    errors = validate_rubric_payload(data)
    if errors:
        raise api_error(422, "rubric_invalid", "Rubric schema is invalid.", {"errors": errors}, request=request)
    new_version = await create_rubric_version(db, rubric, actor.user.id, data)
    await db.commit()
    return rubric_out(rubric, new_version)


@router.post("/rubrics/{rubric_id}/archive", response_model=MessageResponse)
async def archive_rubric(
    rubric_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    rubric, _, _ = await mutable_rubric_for_actor(rubric_id, request, actor, db)
    rubric.status = "archived"
    rubric.updated_at = utc_now()
    await db.commit()
    return MessageResponse(status="ok", message="Rubric archived.")


@router.post("/rubrics/{rubric_id}/restore", response_model=MessageResponse)
async def restore_rubric(
    rubric_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    rubric, _, _ = await mutable_rubric_for_actor(rubric_id, request, actor, db)
    rubric.status = "active"
    rubric.updated_at = utc_now()
    await db.commit()
    return MessageResponse(status="ok", message="Rubric restored.")


@router.post("/rubrics/{rubric_id}/clone", response_model=RubricOut)
async def clone_rubric(
    rubric_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> RubricOut:
    rubric, version, _ = await mutable_rubric_for_actor(rubric_id, request, actor, db)
    data = dict(version.source_payload or {})
    base_key = f"{rubric.slug}-copy"
    candidate = base_key
    index = 1
    while await db.scalar(select(Rubric.id).where(Rubric.project_id == rubric.project_id, Rubric.slug == candidate)):
        index += 1
        candidate = f"{base_key}-{index}"
    data["key"] = candidate
    data["name"] = f"{version.name} copy"
    ctx = await create_rubric_with_version(
        db,
        await db.get(Project, rubric.project_id),
        actor.user.id,
        data,
        await rubric_count(db, rubric.project_id),
    )
    await db.commit()
    return rubric_out(ctx.rubric, ctx.version)


@router.get("/rubrics/{rubric_id}/versions", response_model=RubricVersionsResponse)
async def list_rubric_versions(
    rubric_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> RubricVersionsResponse:
    rubric, _, _ = await rubric_for_actor(rubric_id, request, actor, db)
    versions = await db.scalars(
        select(RubricVersion).where(RubricVersion.rubric_id == rubric.id).order_by(RubricVersion.version_number)
    )
    return RubricVersionsResponse(
        versions=[
            {
                "id": str(version.id),
                "version_number": version.version_number,
                "name": version.name,
                "editorial_min_chars": version.editorial_min_chars,
                "editorial_max_chars": version.editorial_max_chars,
                "checksum": version.checksum,
                "created_at": version.created_at.isoformat(),
            }
            for version in versions
        ]
    )


@router.get("/rubrics/{rubric_id}/form-schema", response_model=SchemaResponse)
async def get_form_schema(
    rubric_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> SchemaResponse:
    rubric, version, input_schema = await rubric_for_actor(rubric_id, request, actor, db)
    return SchemaResponse(
        rubric_id=rubric.id,
        rubric_version_id=version.id,
        json_schema=input_schema.json_schema,
        ui_schema=input_schema.ui_schema,
    )


@router.post("/rubrics/{rubric_id}/validate-schema", response_model=SchemaValidationResponse)
async def validate_rubric_schema(
    rubric_id: UUID,
    payload: SchemaValidationRequest,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> SchemaValidationResponse:
    await rubric_for_actor(rubric_id, request, actor, db)
    errors = validate_rubric_payload(payload.rubric)
    return SchemaValidationResponse(valid=not errors, errors=errors)


@router.post("/rubric-suggestions/{suggestion_id}/accept", response_model=RubricOut)
async def accept_rubric_suggestion(
    suggestion_id: UUID,
    payload: AcceptSuggestionRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> RubricOut:
    suggestion = await db.get(RubricSuggestion, suggestion_id)
    if suggestion is None:
        raise api_error(404, "suggestion_not_found", "Suggestion not found.", request=request)
    _, membership = await require_workspace_membership(suggestion.workspace_id, request, actor, db)
    require_role(membership, {"owner", "admin"}, request)
    if suggestion.project_id is None:
        raise api_error(422, "suggestion_project_required", "Suggestion is not linked to a project.", request=request)
    project = await db.get(Project, suggestion.project_id)
    if project is None:
        raise api_error(404, "project_not_found", "Project not found.", request=request)
    suggestions = list(suggestion.suggestions_json or [])
    if payload.index >= len(suggestions):
        raise api_error(422, "suggestion_index_invalid", "Suggestion index is invalid.", request=request)
    data = {"schema_version": "1.0", **suggestions[payload.index]}
    ctx = await create_rubric_with_version(
        db, project, actor.user.id, data, await rubric_count(db, project.id)
    )
    suggestion.status = "accepted"
    await db.commit()
    return rubric_out(ctx.rubric, ctx.version)


@router.delete("/rubric-suggestions/{suggestion_id}", response_model=MessageResponse)
async def delete_rubric_suggestion(
    suggestion_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    suggestion = await db.get(RubricSuggestion, suggestion_id)
    if suggestion is None:
        raise api_error(404, "suggestion_not_found", "Suggestion not found.", request=request)
    _, membership = await require_workspace_membership(suggestion.workspace_id, request, actor, db)
    require_role(membership, {"owner", "admin"}, request)
    suggestion.status = "discarded"
    await db.commit()
    return MessageResponse(status="ok", message="Suggestion discarded.")


def mock_rubric_suggestions(prompt: str) -> list[dict[str, Any]]:
    base_key = slugify(prompt[:40]) or "custom-rubric"
    return [
        {
            "key": base_key,
            "name": "AI draft rubric",
            "active": True,
            "editorial_limits": {"min_chars": 1200, "max_chars": 2500},
            "ai_mode": "editor",
            "input_flow": [
                {
                    "key": "topic",
                    "label": "Topic",
                    "type": "short_text",
                    "required": True,
                    "fact_locked": True,
                },
                {
                    "key": "sections",
                    "label": "Sections",
                    "type": "repeatable_group",
                    "required": True,
                    "min_items": 1,
                    "fields": [
                        {
                            "key": "heading",
                            "label": "Heading",
                            "type": "short_text",
                            "required": True,
                            "fact_locked": True,
                        },
                        {
                            "key": "notes",
                            "label": "Notes",
                            "type": "voice_or_long_text",
                            "required": True,
                            "fact_locked": True,
                        },
                    ],
                },
            ],
            "generated_fields": ["hook", "cta", "master_text", "platform_variants"],
        }
    ]
