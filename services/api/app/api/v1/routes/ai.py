from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.base import ContentItem, ExamplePost, GenerationRun, Rubric, utc_now
from app.db.session import get_session
from app.modules.ai.providers import ProviderError
from app.modules.ai.service import (
    AiPipelineError,
    approve_example,
    assemble_master,
    extract_facts,
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
from app.modules.content.service import CONTENT_MUTATION_ROLES, READ_ROLES
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
    rubric_id: UUID
    content_item_id: UUID
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
    error_code: str | None
    error_message: str | None
    retry_count: int
    created_at: str
    completed_at: str | None


class MessageResponse(BaseModel):
    status: str
    message: str


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
        error_code=run.error_code,
        error_message=run.error_message,
        retry_count=run.retry_count,
        created_at=run.created_at.isoformat(),
        completed_at=run.completed_at.isoformat() if run.completed_at else None,
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
    item = await mutable_item_for_actor(run.content_item_id, request, actor, db)
    return await run_ai_task(run.task_type, item, actor, db, settings, request)
