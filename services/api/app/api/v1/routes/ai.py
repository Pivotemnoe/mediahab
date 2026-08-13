from __future__ import annotations

from typing import Any, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.base import (
    ContentBlock,
    ContentItem,
    ExamplePost,
    GenerationRun,
    Project,
    Rubric,
    RubricVersion,
    UsageEvent,
    Workspace,
    utc_now,
)
from app.db.session import get_session
from app.modules.ai.providers import ProviderError
from app.modules.ai.service import (
    AiPipelineError,
    IDEA_TASK_TYPE,
    approve_example,
    assemble_master,
    create_project_idea_run,
    execute_project_idea_run,
    extract_facts,
    idea_generation_usage,
    idea_generator_enabled,
    import_example_post,
    quality_check,
    reject_example,
    suggest_hook,
    suggest_ratings,
)
from app.modules.auth.dependencies import (
    Actor,
    get_current_actor,
    require_csrf,
    require_role,
    require_workspace_membership,
)
from app.modules.billing.service import (
    UsageEntitlementError,
    reserve_ai_text_generation_usage,
)
from app.modules.content.service import (
    CONTENT_MUTATION_ROLES,
    READ_ROLES,
    resolve_content_create_context,
    upsert_block,
    write_content_revision,
)
from app.modules.projects.service import get_active_project
from app.modules.shared.errors import api_error

router = APIRouter()


class ExampleMetricsIn(BaseModel):
    views: int | None = Field(default=None, ge=0)
    reactions: int | None = Field(default=None, ge=0)
    comments: int | None = Field(default=None, ge=0)
    shares: int | None = Field(default=None, ge=0)
    engagement_rate: float | None = Field(default=None, ge=0)


class ExampleImportItem(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    title: str | None = Field(default=None, max_length=240)
    rubric_id: UUID | None = None
    source_type: str = Field(default="manual", pattern="^(manual|json|telegram)$")
    source_external_id: str | None = Field(default=None, max_length=220)
    labels: list[str] = Field(default_factory=list, max_length=20)
    manual_quality_score: int | None = Field(default=None, ge=1, le=9)
    metrics: ExampleMetricsIn | None = None


class ExampleImportRequest(BaseModel):
    examples: list[ExampleImportItem] = Field(min_length=1, max_length=100)
    approve_immediately: bool = False


class ExampleOut(BaseModel):
    id: UUID
    workspace_id: UUID
    project_id: UUID
    rubric_id: UUID | None
    source_type: str
    source_external_id: str | None
    title: str | None
    text: str
    character_count: int
    status: str
    labels: list[str]
    manual_quality_score: int | None
    created_at: str


class ExampleImportResponse(BaseModel):
    imported: list[ExampleOut]
    duplicates: list[ExampleOut]


class ExampleListResponse(BaseModel):
    examples: list[ExampleOut]


class GenerationRunOut(BaseModel):
    id: UUID
    workspace_id: UUID
    project_id: UUID
    rubric_id: UUID | None
    content_item_id: UUID | None
    task_type: str
    provider_key: str
    model_id: str
    status: str
    response_json: dict[str, Any] | None
    retrieved_example_ids: list[str]
    latency_ms: int | None
    input_tokens: int | None
    output_tokens: int | None
    input_characters: int | None
    output_characters: int | None
    cost_estimate_micro_usd: int | None
    error_code: str | None
    error_message: str | None
    retry_count: int
    created_at: str
    completed_at: str | None


class MessageResponse(BaseModel):
    status: str
    message: str


class IdeaCapabilityOut(BaseModel):
    enabled: bool
    can_generate: bool
    daily_limit: int
    used_today: int
    remaining_today: int


class IdeaGenerateRequest(BaseModel):
    rubric_id: UUID | None = None
    topic: str | None = Field(default=None, max_length=1000)
    goal: Literal["engage", "explain", "share_experience", "soft_sell", "open"] = "open"


class ContentIdeaOut(BaseModel):
    id: str
    title: str
    angle: str
    idea_brief: str
    starter_outline: str
    detail_questions: list[str]


class IdeaAcceptRequest(BaseModel):
    client_content_id: UUID


class IdeaContentItemOut(BaseModel):
    id: UUID
    workspace_id: UUID
    project_id: UUID
    rubric_id: UUID
    rubric_version_id: UUID
    project_version_id: UUID
    title_internal: str
    status: str
    version: int
    created_at: str
    updated_at: str


class IdeaBriefBlockOut(BaseModel):
    id: UUID
    content_item_id: UUID
    field_key: str
    group_key: str | None
    group_index: int | None
    source_type: str
    value_json: Any
    transcript_text: str | None
    is_locked: bool
    source_media_id: UUID | None
    revision_number: int
    updated_at: str


class IdeaAcceptOut(BaseModel):
    content_item: IdeaContentItemOut
    idea: ContentIdeaOut
    idea_brief: IdeaBriefBlockOut


def example_out(example: ExamplePost) -> ExampleOut:
    labels = example.labels_json if isinstance(example.labels_json, list) else []
    return ExampleOut(
        id=example.id,
        workspace_id=example.workspace_id,
        project_id=example.project_id,
        rubric_id=example.rubric_id,
        source_type=example.source_type,
        source_external_id=example.source_external_id,
        title=example.title,
        text=example.text,
        character_count=example.character_count,
        status=example.status,
        labels=[str(label) for label in labels],
        manual_quality_score=example.manual_quality_score,
        created_at=example.created_at.isoformat(),
    )


def generation_run_out(run: GenerationRun) -> GenerationRunOut:
    retrieved = run.retrieved_example_ids if isinstance(run.retrieved_example_ids, list) else []
    response_json = run.response_json if isinstance(run.response_json, dict) else None
    return GenerationRunOut(
        id=run.id,
        workspace_id=run.workspace_id,
        project_id=run.project_id,
        rubric_id=run.rubric_id,
        content_item_id=run.content_item_id,
        task_type=run.task_type,
        provider_key=run.provider_key,
        model_id=run.model_id,
        status=run.status,
        response_json=response_json,
        retrieved_example_ids=[str(value) for value in retrieved],
        latency_ms=run.latency_ms,
        input_tokens=run.input_tokens,
        output_tokens=run.output_tokens,
        input_characters=run.input_characters,
        output_characters=run.output_characters,
        cost_estimate_micro_usd=run.cost_estimate_micro_usd,
        error_code=run.error_code,
        error_message=run.error_message,
        retry_count=run.retry_count,
        created_at=run.created_at.isoformat(),
        completed_at=run.completed_at.isoformat() if run.completed_at else None,
    )


def idea_content_item_out(item: ContentItem) -> IdeaContentItemOut:
    return IdeaContentItemOut(
        id=item.id,
        workspace_id=item.workspace_id,
        project_id=item.project_id,
        rubric_id=item.rubric_id,
        rubric_version_id=item.rubric_version_id,
        project_version_id=item.project_version_id,
        title_internal=item.title_internal,
        status=item.status,
        version=item.version,
        created_at=item.created_at.isoformat(),
        updated_at=item.updated_at.isoformat(),
    )


def idea_brief_block_out(block: ContentBlock) -> IdeaBriefBlockOut:
    return IdeaBriefBlockOut(
        id=block.id,
        content_item_id=block.content_item_id,
        field_key=block.field_key,
        group_key=block.group_key,
        group_index=block.group_index,
        source_type=block.source_type,
        value_json=block.value_json,
        transcript_text=block.transcript_text,
        is_locked=block.is_locked,
        source_media_id=block.source_media_id,
        revision_number=block.revision_number,
        updated_at=block.updated_at.isoformat(),
    )


def content_idea_from_run(run: GenerationRun, idea_id: str) -> dict[str, Any] | None:
    response = run.response_json if isinstance(run.response_json, dict) else {}
    for raw_idea in response.get("ideas") or []:
        if isinstance(raw_idea, dict) and raw_idea.get("id") == idea_id:
            return raw_idea
    return None


async def accepted_idea_response(
    db: AsyncSession,
    run: GenerationRun,
    idea: dict[str, Any],
    client_content_id: UUID,
) -> IdeaAcceptOut | None:
    item = await db.get(ContentItem, client_content_id)
    if item is None:
        return None
    block = await db.scalar(
        select(ContentBlock).where(
            ContentBlock.content_item_id == item.id,
            ContentBlock.field_key == "idea_brief",
            ContentBlock.group_key.is_(None),
            ContentBlock.group_index.is_(None),
        )
    )
    value = block.value_json if block is not None and isinstance(block.value_json, dict) else {}
    provenance = value.get("provenance") if isinstance(value.get("provenance"), dict) else {}
    expected = {
        "run_id": str(run.id),
        "idea_id": str(idea["id"]),
        "client_content_id": str(client_content_id),
        "content_item_id": str(item.id),
    }
    if (
        item.workspace_id != run.workspace_id
        or item.project_id != run.project_id
        or block is None
        or block.source_type != "ai_suggested"
        or any(str(provenance.get(key)) != value for key, value in expected.items())
    ):
        return None
    return IdeaAcceptOut(
        content_item=idea_content_item_out(item),
        idea=ContentIdeaOut.model_validate(idea),
        idea_brief=idea_brief_block_out(block),
    )


async def project_for_actor(
    project_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
):
    ctx = await get_active_project(db, project_id)
    if ctx is None:
        raise api_error(404, "project_not_found", "Project not found.", request=request)
    try:
        _, membership = await require_workspace_membership(ctx.project.workspace_id, request, actor, db)
    except HTTPException as exc:
        raise api_error(404, "project_not_found", "Project not found.", request=request) from exc
    return ctx, membership


async def item_for_actor(
    content_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[ContentItem, Any]:
    item = await db.get(ContentItem, content_id)
    if item is None or item.deleted_at is not None:
        raise api_error(404, "content_not_found", "Content item not found.", request=request)
    try:
        _, membership = await require_workspace_membership(item.workspace_id, request, actor, db)
    except HTTPException as exc:
        raise api_error(404, "content_not_found", "Content item not found.", request=request) from exc
    return item, membership


async def mutable_item_for_actor(
    content_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> ContentItem:
    item, membership = await item_for_actor(content_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    return item


async def example_for_actor(
    example_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[ExamplePost, Any]:
    example = await db.get(ExamplePost, example_id)
    if example is None:
        raise api_error(404, "example_not_found", "Example not found.", request=request)
    try:
        _, membership = await require_workspace_membership(example.workspace_id, request, actor, db)
    except HTTPException as exc:
        raise api_error(404, "example_not_found", "Example not found.", request=request) from exc
    return example, membership


async def run_for_actor(
    run_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[GenerationRun, Any]:
    run = await db.get(GenerationRun, run_id)
    if run is None:
        raise api_error(404, "ai_run_not_found", "AI run not found.", request=request)
    try:
        _, membership = await require_workspace_membership(run.workspace_id, request, actor, db)
    except HTTPException as exc:
        raise api_error(404, "ai_run_not_found", "AI run not found.", request=request) from exc
    return run, membership


async def active_rubric_version_for_idea(
    db: AsyncSession,
    project_id: UUID,
    rubric_id: UUID | None,
) -> RubricVersion | None:
    if rubric_id is None:
        return None
    row = (
        await db.execute(
            select(RubricVersion)
            .join(Rubric, Rubric.active_version_id == RubricVersion.id)
            .where(
                Rubric.id == rubric_id,
                Rubric.project_id == project_id,
                Rubric.status == "active",
            )
        )
    ).scalar_one_or_none()
    return row


async def reserve_idea_run(
    db: AsyncSession,
    settings: Settings,
    project: Project,
    project_version: Any,
    rubric_version: RubricVersion | None,
    actor_user_id: UUID,
    topic: str | None,
    goal: str,
    request: Request,
    retry_count: int = 0,
    source_run_id: UUID | None = None,
) -> GenerationRun:
    # The row lock serializes quota reservations per workspace. Commit releases it before AI I/O.
    await db.scalar(select(Workspace).where(Workspace.id == project.workspace_id).with_for_update())
    usage = await idea_generation_usage(db, project.workspace_id, settings)
    if usage["remaining_today"] <= 0:
        raise api_error(
            429,
            "idea_daily_limit_reached",
            "Daily idea generation limit reached.",
            {
                "daily_limit": usage["daily_limit"],
                "used_today": usage["used_today"],
                "reset_at": usage["reset_at"].isoformat(),
            },
            request=request,
        )
    run_id = uuid4()
    try:
        await reserve_ai_text_generation_usage(
            db,
            workspace_id=project.workspace_id,
            generation_run_id=run_id,
            source="idea_generator",
            metadata={
                "project_id": str(project.id),
                "task_type": IDEA_TASK_TYPE,
                "source_run_id": str(source_run_id) if source_run_id is not None else None,
            },
            workspace_lock_held=True,
        )
    except UsageEntitlementError as exc:
        raise api_error(
            402,
            exc.code,
            exc.message,
            exc.details,
            request=request,
        ) from exc
    run = await create_project_idea_run(
        db,
        settings,
        project,
        project_version,
        rubric_version,
        actor_user_id,
        topic,
        goal,
        retry_count=retry_count,
        source_run_id=source_run_id,
        run_id=run_id,
    )
    await db.commit()
    return run


@router.post("/projects/{project_id}/examples/import", response_model=ExampleImportResponse)
async def import_examples(
    project_id: UUID,
    payload: ExampleImportRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ExampleImportResponse:
    ctx, membership = await project_for_actor(project_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    imported: list[ExamplePost] = []
    duplicates: list[ExamplePost] = []
    for item in payload.examples:
        if item.rubric_id is not None:
            rubric = await db.get(Rubric, item.rubric_id)
            if rubric is None or rubric.project_id != ctx.project.id:
                raise api_error(404, "rubric_not_found", "Rubric not found.", request=request)
        data = item.model_dump(exclude_none=True)
        if item.metrics is not None:
            data["metrics"] = item.metrics.model_dump(exclude_none=True)
        example, created = await import_example_post(
            db,
            ctx.project.id,
            ctx.project.workspace_id,
            actor.user.id,
            data,
        )
        if payload.approve_immediately and created:
            try:
                await approve_example(db, settings, example, actor.user.id)
            except ProviderError as exc:
                raise api_error(503, exc.code, exc.message, request=request) from exc
        (imported if created else duplicates).append(example)
    await db.commit()
    return ExampleImportResponse(
        imported=[example_out(example) for example in imported],
        duplicates=[example_out(example) for example in duplicates],
    )


@router.get("/projects/{project_id}/examples", response_model=ExampleListResponse)
async def list_examples(
    project_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> ExampleListResponse:
    ctx, membership = await project_for_actor(project_id, request, actor, db)
    require_role(membership, READ_ROLES, request)
    rows = (
        await db.scalars(
            select(ExamplePost)
            .where(ExamplePost.project_id == ctx.project.id)
            .order_by(ExamplePost.created_at.desc())
        )
    ).all()
    return ExampleListResponse(examples=[example_out(row) for row in rows])


@router.get(
    "/projects/{project_id}/ideas/capability",
    response_model=IdeaCapabilityOut,
)
async def idea_capability(
    project_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> IdeaCapabilityOut:
    ctx, membership = await project_for_actor(project_id, request, actor, db)
    require_role(membership, READ_ROLES, request)
    usage = await idea_generation_usage(db, ctx.project.workspace_id, settings)
    enabled = idea_generator_enabled(settings, ctx.project.workspace_id)
    can_generate = enabled and membership.role_key in CONTENT_MUTATION_ROLES
    return IdeaCapabilityOut(
        enabled=enabled,
        can_generate=can_generate,
        daily_limit=usage["daily_limit"],
        used_today=usage["used_today"],
        remaining_today=usage["remaining_today"] if can_generate else 0,
    )


@router.post(
    "/projects/{project_id}/ideas/generate",
    response_model=GenerationRunOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_content_ideas(
    project_id: UUID,
    payload: IdeaGenerateRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GenerationRunOut:
    ctx, membership = await project_for_actor(project_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    if not idea_generator_enabled(settings, ctx.project.workspace_id):
        raise api_error(
            403,
            "idea_generator_unavailable",
            "Idea generation is not enabled for this workspace.",
            request=request,
        )
    rubric_version = await active_rubric_version_for_idea(db, project_id, payload.rubric_id)
    if payload.rubric_id is not None and rubric_version is None:
        raise api_error(404, "rubric_not_found", "Rubric not found.", request=request)
    run = await reserve_idea_run(
        db,
        settings,
        ctx.project,
        ctx.version,
        rubric_version,
        actor.user.id,
        payload.topic,
        payload.goal,
        request,
    )
    run = await execute_project_idea_run(
        db,
        settings,
        run,
        ctx.project,
        ctx.version,
        rubric_version,
    )
    await db.commit()
    return generation_run_out(run)


@router.get("/examples/{example_id}", response_model=ExampleOut)
async def get_example(
    example_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> ExampleOut:
    example, membership = await example_for_actor(example_id, request, actor, db)
    require_role(membership, READ_ROLES, request)
    return example_out(example)


@router.post("/examples/{example_id}/approve", response_model=ExampleOut)
async def approve_example_route(
    example_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ExampleOut:
    example, membership = await example_for_actor(example_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    try:
        await approve_example(db, settings, example, actor.user.id)
    except ProviderError as exc:
        raise api_error(503, exc.code, exc.message, request=request) from exc
    await db.commit()
    return example_out(example)


@router.post("/examples/{example_id}/reject", response_model=ExampleOut)
async def reject_example_route(
    example_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> ExampleOut:
    example, membership = await example_for_actor(example_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    await reject_example(db, example, actor.user.id)
    await db.commit()
    return example_out(example)


async def run_ai_task(
    task: str,
    item: ContentItem,
    actor: Actor,
    db: AsyncSession,
    settings: Settings,
    request: Request,
) -> GenerationRunOut:
    try:
        if task == "extract_facts":
            run = await extract_facts(db, settings, item, actor.user.id)
        elif task == "assemble_master":
            run = await assemble_master(db, settings, item, actor.user.id)
        elif task == "suggest_hook":
            run = await suggest_hook(db, settings, item, actor.user.id)
        elif task == "suggest_ratings":
            run = await suggest_ratings(db, settings, item, actor.user.id)
        elif task == "quality_check":
            run = await quality_check(db, settings, item, actor.user.id)
        else:
            raise api_error(422, "unknown_ai_task", "Unknown AI task.", request=request)
    except ProviderError as exc:
        raise api_error(503, exc.code, exc.message, request=request) from exc
    except AiPipelineError as exc:
        raise api_error(422, exc.code, exc.message, exc.details, request=request) from exc
    await db.commit()
    return generation_run_out(run)


@router.post(
    "/content-items/{content_id}/extract-facts",
    response_model=GenerationRunOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def extract_facts_route(
    content_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GenerationRunOut:
    item = await mutable_item_for_actor(content_id, request, actor, db)
    return await run_ai_task("extract_facts", item, actor, db, settings, request)


@router.post(
    "/content-items/{content_id}/assemble-master",
    response_model=GenerationRunOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def assemble_master_route(
    content_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GenerationRunOut:
    item = await mutable_item_for_actor(content_id, request, actor, db)
    return await run_ai_task("assemble_master", item, actor, db, settings, request)


@router.post(
    "/content-items/{content_id}/suggest-hook",
    response_model=GenerationRunOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def suggest_hook_route(
    content_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GenerationRunOut:
    item = await mutable_item_for_actor(content_id, request, actor, db)
    return await run_ai_task("suggest_hook", item, actor, db, settings, request)


@router.post(
    "/content-items/{content_id}/suggest-ratings",
    response_model=GenerationRunOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def suggest_ratings_route(
    content_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GenerationRunOut:
    item = await mutable_item_for_actor(content_id, request, actor, db)
    return await run_ai_task("suggest_ratings", item, actor, db, settings, request)


@router.post(
    "/content-items/{content_id}/quality-check",
    response_model=GenerationRunOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def quality_check_route(
    content_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GenerationRunOut:
    item = await mutable_item_for_actor(content_id, request, actor, db)
    return await run_ai_task("quality_check", item, actor, db, settings, request)


@router.get("/ai-runs/{run_id}", response_model=GenerationRunOut)
async def get_ai_run(
    run_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> GenerationRunOut:
    run, membership = await run_for_actor(run_id, request, actor, db)
    require_role(membership, READ_ROLES, request)
    return generation_run_out(run)


@router.post(
    "/ai-runs/{run_id}/ideas/{idea_id}/accept",
    response_model=IdeaAcceptOut,
)
async def accept_content_idea(
    run_id: UUID,
    idea_id: str,
    payload: IdeaAcceptRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> IdeaAcceptOut:
    run, membership = await run_for_actor(run_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    if run.task_type != IDEA_TASK_TYPE or run.status != "completed":
        raise api_error(
            409,
            "idea_run_not_acceptable",
            "Only a completed idea generation run can be accepted.",
            request=request,
        )
    locked_run = await db.scalar(
        select(GenerationRun)
        .where(GenerationRun.id == run.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    assert locked_run is not None
    run = locked_run
    idea = content_idea_from_run(run, idea_id)
    if idea is None:
        raise api_error(404, "idea_not_found", "Idea not found in this run.", request=request)

    existing = await accepted_idea_response(db, run, idea, payload.client_content_id)
    if existing is not None:
        return existing
    occupied = await db.get(ContentItem, payload.client_content_id)
    if occupied is not None:
        raise api_error(
            409,
            "client_content_id_conflict",
            "This client content id is already used for another draft.",
            request=request,
        )
    if run.content_item_id is not None:
        raise api_error(
            409,
            "idea_already_accepted",
            "An idea from this run has already been accepted.",
            {"content_item_id": str(run.content_item_id)},
            request=request,
        )

    create_context = await resolve_content_create_context(
        db,
        run.project_id,
        run.rubric_id,
        actor.user.id,
    )
    if create_context is None:
        raise api_error(404, "rubric_not_found", "Rubric not found.", request=request)
    now = utc_now()
    item = ContentItem(
        id=payload.client_content_id,
        workspace_id=run.workspace_id,
        project_id=run.project_id,
        rubric_id=create_context.rubric.id,
        rubric_version_id=create_context.rubric_version.id,
        project_version_id=create_context.project_version.id,
        title_internal=str(idea["title"])[:200],
        status="draft",
        created_by=actor.user.id,
        created_at=now,
        updated_at=now,
        version=1,
    )
    db.add(item)
    await db.flush()
    provenance = {
        "run_id": str(run.id),
        "idea_id": str(idea["id"]),
        "client_content_id": str(payload.client_content_id),
        "content_item_id": str(item.id),
    }
    block = await upsert_block(
        db,
        item,
        actor.user.id,
        "idea_brief",
        {
            "text": str(idea["starter_outline"]),
            "idea": idea,
            "provenance": provenance,
        },
        source_type="ai_suggested",
        lock=False,
    )
    revision = await write_content_revision(
        db,
        item,
        actor.user.id,
        "ai_idea_acceptance",
        {
            "event": "idea_accepted",
            "provenance": provenance,
            "idea": idea,
            "idea_brief_block_id": str(block.id),
        },
        text="",
    )
    revision.generation_run_id = run.id
    run.content_item_id = item.id
    run.updated_at = utc_now()
    db.add(
        UsageEvent(
            id=uuid4(),
            workspace_id=run.workspace_id,
            key="content_idea_accepted",
            quantity=1,
            source="idea_generator",
            metadata_json={"project_id": str(run.project_id), **provenance},
            created_at=utc_now(),
        )
    )
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        persisted_run = await db.get(GenerationRun, run_id)
        if persisted_run is not None:
            persisted_idea = content_idea_from_run(persisted_run, idea_id)
            if persisted_idea is not None:
                persisted = await accepted_idea_response(
                    db,
                    persisted_run,
                    persisted_idea,
                    payload.client_content_id,
                )
                if persisted is not None:
                    return persisted
        raise api_error(
            409,
            "client_content_id_conflict",
            "This client content id is already used for another draft.",
            request=request,
        )
    return IdeaAcceptOut(
        content_item=idea_content_item_out(item),
        idea=ContentIdeaOut.model_validate(idea),
        idea_brief=idea_brief_block_out(block),
    )


@router.post("/ai-runs/{run_id}/cancel", response_model=GenerationRunOut)
async def cancel_ai_run(
    run_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> GenerationRunOut:
    run, membership = await run_for_actor(run_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    if run.status not in {"completed", "failed", "canceled"}:
        run.status = "canceled"
        run.error_code = "canceled"
        run.error_message = "AI run was canceled by user."
        run.completed_at = utc_now()
        run.updated_at = utc_now()
        await db.commit()
    return generation_run_out(run)


@router.post(
    "/ai-runs/{run_id}/retry",
    response_model=GenerationRunOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def retry_ai_run(
    run_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GenerationRunOut:
    run, membership = await run_for_actor(run_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    if run.task_type == IDEA_TASK_TYPE:
        if run.status != "failed":
            raise api_error(
                409,
                "idea_run_not_retryable",
                "Only a failed idea generation run can be retried.",
                request=request,
            )
        if not idea_generator_enabled(settings, run.workspace_id):
            raise api_error(
                403,
                "idea_generator_unavailable",
                "Idea generation is not enabled for this workspace.",
                request=request,
            )
        project_ctx = await get_active_project(db, run.project_id)
        if project_ctx is None or project_ctx.project.workspace_id != run.workspace_id:
            raise api_error(404, "project_not_found", "Project not found.", request=request)
        rubric_version = await active_rubric_version_for_idea(db, run.project_id, run.rubric_id)
        if run.rubric_id is not None and rubric_version is None:
            raise api_error(404, "rubric_not_found", "Rubric not found.", request=request)
        metadata = run.request_metadata_json if isinstance(run.request_metadata_json, dict) else {}
        new_run = await reserve_idea_run(
            db,
            settings,
            project_ctx.project,
            project_ctx.version,
            rubric_version,
            actor.user.id,
            metadata.get("topic") if isinstance(metadata.get("topic"), str) else None,
            str(metadata.get("goal") or "Найти полезную тему для следующей публикации"),
            request,
            retry_count=run.retry_count + 1,
            source_run_id=run.id,
        )
        new_run = await execute_project_idea_run(
            db,
            settings,
            new_run,
            project_ctx.project,
            project_ctx.version,
            rubric_version,
        )
        await db.commit()
        return generation_run_out(new_run)
    if run.content_item_id is None:
        raise api_error(
            409,
            "ai_run_not_retryable",
            "This AI run has no content draft to retry.",
            request=request,
        )
    item = await mutable_item_for_actor(run.content_item_id, request, actor, db)
    return await run_ai_task(run.task_type, item, actor, db, settings, request)
