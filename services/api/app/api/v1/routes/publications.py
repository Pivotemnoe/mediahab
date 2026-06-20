from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import (
    ExternalPost,
    PlatformVariant,
    ProjectDestination,
    Publication,
    PublicationAttempt,
    WebhookInbox,
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
from app.modules.projects.service import get_active_project
from app.modules.publications.connectors import capability_for, redacted_destination_configuration
from app.modules.publications.service import (
    CONTENT_PREPARATION_ROLES,
    CONTENT_PUBLISH_ROLES,
    READ_ROLES,
    PublicationCoreError,
    approve_platform_variant,
    attempts_for_publication,
    cancel_publication,
    confirm_manual_publication,
    create_project_destination,
    create_publication,
    edit_platform_variant,
    enqueue_publication,
    ensure_publication_catalog,
    external_posts_for_publication,
    generate_variants_for_content,
    list_project_destinations,
    list_publications,
    list_variants_for_content,
    mark_external_post_deleted,
    process_publication_outbox,
    record_webhook_inbox,
    retry_publication,
    test_destination,
    update_project_destination,
    validate_platform_variant,
)
from app.modules.shared.errors import api_error

router = APIRouter()


class GenerateVariantsRequest(BaseModel):
    platform_keys: list[str] | None = Field(default=None, max_length=12)


class PlatformVariantPatchRequest(BaseModel):
    text: str = Field(min_length=1, max_length=120000)


class PlatformVariantOut(BaseModel):
    id: UUID
    workspace_id: UUID
    content_item_id: UUID
    master_revision_id: UUID
    platform_key: str
    revision_number: int
    status: str
    text: str
    rendered_text: str
    payload: dict[str, Any]
    validation: dict[str, Any]
    character_count: int
    parent_variant_id: UUID | None
    superseded_by_variant_id: UUID | None
    approved_at: str | None
    created_at: str
    updated_at: str


class PlatformVariantsResponse(BaseModel):
    variants: list[PlatformVariantOut]


class DestinationCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    platform_key: str = Field(min_length=1, max_length=80)
    connector_key: str | None = Field(default=None, max_length=80)
    configuration: dict[str, Any] = Field(default_factory=dict)
    publication_mode: str | None = Field(default=None, max_length=80)


class DestinationPatchRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    status: str | None = Field(default=None, pattern="^(active|paused|disabled)$")
    configuration: dict[str, Any] | None = None


class DestinationOut(BaseModel):
    id: UUID
    workspace_id: UUID
    project_id: UUID
    platform_key: str
    connector_key: str
    name: str
    status: str
    publication_mode: str
    configuration: dict[str, Any]
    version: int
    created_at: str
    updated_at: str


class DestinationsResponse(BaseModel):
    destinations: list[DestinationOut]


class CapabilityResponse(BaseModel):
    platform_key: str
    connector_key: str
    name: str
    capabilities: dict[str, Any]
    hard_limits: dict[str, Any]
    publication_mode: str
    automated_delivery: bool


class DestinationTestResponse(BaseModel):
    ok: bool
    connector_key: str
    configuration: dict[str, Any]
    message: str


class PublicationCreateRequest(BaseModel):
    destination_id: UUID
    idempotency_key: str | None = Field(default=None, max_length=160)


class PublicationScheduleRequest(BaseModel):
    scheduled_at: datetime


class ManualConfirmationRequest(BaseModel):
    external_url: str | None = Field(default=None, max_length=2048)
    external_post_id: str | None = Field(default=None, max_length=240)
    evidence: dict[str, Any] | None = None


class PublicationOut(BaseModel):
    id: UUID
    workspace_id: UUID
    project_id: UUID
    content_item_id: UUID
    platform_variant_id: UUID
    destination_id: UUID
    status: str
    scheduled_at: str | None
    queued_at: str | None
    published_at: str | None
    cancelled_at: str | None
    publication_method: str | None
    confirmed_by: UUID | None
    confirmed_at: str | None
    external_url: str | None
    external_post_id: str | None
    confirmation_evidence: dict[str, Any] | None
    last_error_code: str | None
    last_error_message: str | None
    idempotency_key: str | None
    version: int
    created_at: str
    updated_at: str
    external_posts: list[dict[str, Any]] = Field(default_factory=list)


class PublicationsResponse(BaseModel):
    publications: list[PublicationOut]


class AttemptOut(BaseModel):
    id: UUID
    publication_id: UUID
    destination_id: UUID
    connector_key: str
    attempt_number: int
    status: str
    retryable: bool
    request_payload: dict[str, Any] | None
    response_payload: dict[str, Any] | None
    error_code: str | None
    error_message: str | None
    started_at: str
    completed_at: str | None


class AttemptsResponse(BaseModel):
    attempts: list[AttemptOut]


class WebhookInboxOut(BaseModel):
    id: UUID
    destination_id: UUID | None
    connector_key: str
    event_type: str
    signature_valid: bool
    dedupe_key: str | None
    status: str
    received_at: str


class WebhookCallbackRequest(BaseModel):
    event_type: str | None = None
    dedupe_key: str | None = Field(default=None, max_length=160)
    signature_valid: bool = False
    payload: dict[str, Any] = Field(default_factory=dict)


class MessageResponse(BaseModel):
    status: str
    message: str


def handle_publication_error(exc: PublicationCoreError, request: Request) -> HTTPException:
    return api_error(exc.status_code, exc.code, exc.message, exc.details, request=request)


def variant_out(variant: PlatformVariant) -> PlatformVariantOut:
    payload = variant.payload_json if isinstance(variant.payload_json, dict) else {}
    validation = variant.validation_json if isinstance(variant.validation_json, dict) else {}
    return PlatformVariantOut(
        id=variant.id,
        workspace_id=variant.workspace_id,
        content_item_id=variant.content_item_id,
        master_revision_id=variant.master_revision_id,
        platform_key=variant.platform_key,
        revision_number=variant.revision_number,
        status=variant.status,
        text=variant.text,
        rendered_text=variant.rendered_text,
        payload=payload,
        validation=validation,
        character_count=variant.character_count,
        parent_variant_id=variant.parent_variant_id,
        superseded_by_variant_id=variant.superseded_by_variant_id,
        approved_at=variant.approved_at.isoformat() if variant.approved_at else None,
        created_at=variant.created_at.isoformat(),
        updated_at=variant.updated_at.isoformat(),
    )


def destination_out(destination: ProjectDestination) -> DestinationOut:
    configuration = destination.configuration_json
    if not isinstance(configuration, dict):
        configuration = {}
    return DestinationOut(
        id=destination.id,
        workspace_id=destination.workspace_id,
        project_id=destination.project_id,
        platform_key=destination.platform_key,
        connector_key=destination.connector_key,
        name=destination.name,
        status=destination.status,
        publication_mode=destination.publication_mode,
        configuration=redacted_destination_configuration(configuration),
        version=destination.version,
        created_at=destination.created_at.isoformat(),
        updated_at=destination.updated_at.isoformat(),
    )


def external_post_out(post: ExternalPost) -> dict[str, Any]:
    return {
        "id": str(post.id),
        "publication_id": str(post.publication_id),
        "destination_id": str(post.destination_id),
        "connector_key": post.connector_key,
        "provider_external_id": post.provider_external_id,
        "permalink_url": post.permalink_url,
        "status": post.status,
        "idempotency_key": post.idempotency_key,
        "created_at": post.created_at.isoformat(),
    }


async def publication_out(db: AsyncSession, publication: Publication) -> PublicationOut:
    posts = await external_posts_for_publication(db, publication)
    return PublicationOut(
        id=publication.id,
        workspace_id=publication.workspace_id,
        project_id=publication.project_id,
        content_item_id=publication.content_item_id,
        platform_variant_id=publication.platform_variant_id,
        destination_id=publication.destination_id,
        status=publication.status,
        scheduled_at=publication.scheduled_at.isoformat() if publication.scheduled_at else None,
        queued_at=publication.queued_at.isoformat() if publication.queued_at else None,
        published_at=publication.published_at.isoformat() if publication.published_at else None,
        cancelled_at=publication.cancelled_at.isoformat() if publication.cancelled_at else None,
        publication_method=publication.publication_method,
        confirmed_by=publication.confirmed_by,
        confirmed_at=publication.confirmed_at.isoformat() if publication.confirmed_at else None,
        external_url=publication.external_url,
        external_post_id=publication.external_post_id,
        confirmation_evidence=publication.confirmation_evidence_json
        if isinstance(publication.confirmation_evidence_json, dict)
        else None,
        last_error_code=publication.last_error_code,
        last_error_message=publication.last_error_message,
        idempotency_key=publication.idempotency_key,
        version=publication.version,
        created_at=publication.created_at.isoformat(),
        updated_at=publication.updated_at.isoformat(),
        external_posts=[external_post_out(post) for post in posts],
    )


def attempt_out(attempt: PublicationAttempt) -> AttemptOut:
    request_payload = attempt.request_payload_json
    response_payload = attempt.response_payload_json
    return AttemptOut(
        id=attempt.id,
        publication_id=attempt.publication_id,
        destination_id=attempt.destination_id,
        connector_key=attempt.connector_key,
        attempt_number=attempt.attempt_number,
        status=attempt.status,
        retryable=attempt.retryable,
        request_payload=request_payload if isinstance(request_payload, dict) else None,
        response_payload=response_payload if isinstance(response_payload, dict) else None,
        error_code=attempt.error_code,
        error_message=attempt.error_message,
        started_at=attempt.started_at.isoformat(),
        completed_at=attempt.completed_at.isoformat() if attempt.completed_at else None,
    )


def webhook_inbox_out(inbox: WebhookInbox) -> WebhookInboxOut:
    return WebhookInboxOut(
        id=inbox.id,
        destination_id=inbox.destination_id,
        connector_key=inbox.connector_key,
        event_type=inbox.event_type,
        signature_valid=inbox.signature_valid,
        dedupe_key=inbox.dedupe_key,
        status=inbox.status,
        received_at=inbox.received_at.isoformat(),
    )


async def item_for_actor(content_id: UUID, request: Request, actor: Actor, db: AsyncSession):
    from app.db.base import ContentItem

    item = await db.get(ContentItem, content_id)
    if item is None or item.deleted_at is not None:
        raise api_error(404, "content_not_found", "Content item not found.", request=request)
    try:
        _, membership = await require_workspace_membership(item.workspace_id, request, actor, db)
    except HTTPException as exc:
        raise api_error(404, "content_not_found", "Content item not found.", request=request) from exc
    return item, membership


async def project_for_actor(project_id: UUID, request: Request, actor: Actor, db: AsyncSession):
    ctx = await get_active_project(db, project_id)
    if ctx is None:
        raise api_error(404, "project_not_found", "Project not found.", request=request)
    try:
        _, membership = await require_workspace_membership(ctx.project.workspace_id, request, actor, db)
    except HTTPException as exc:
        raise api_error(404, "project_not_found", "Project not found.", request=request) from exc
    return ctx.project, membership


async def variant_for_actor(
    variant_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[PlatformVariant, Any]:
    variant = await db.get(PlatformVariant, variant_id)
    if variant is None:
        raise api_error(404, "variant_not_found", "Platform variant not found.", request=request)
    try:
        _, membership = await require_workspace_membership(variant.workspace_id, request, actor, db)
    except HTTPException as exc:
        raise api_error(404, "variant_not_found", "Platform variant not found.", request=request) from exc
    return variant, membership


async def destination_for_actor(
    destination_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[ProjectDestination, Any]:
    destination = await db.get(ProjectDestination, destination_id)
    if destination is None or destination.deleted_at is not None:
        raise api_error(404, "destination_not_found", "Destination not found.", request=request)
    try:
        _, membership = await require_workspace_membership(destination.workspace_id, request, actor, db)
    except HTTPException as exc:
        raise api_error(404, "destination_not_found", "Destination not found.", request=request) from exc
    return destination, membership


async def publication_for_actor(
    publication_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[Publication, Any]:
    publication = await db.get(Publication, publication_id)
    if publication is None:
        raise api_error(404, "publication_not_found", "Publication not found.", request=request)
    try:
        _, membership = await require_workspace_membership(publication.workspace_id, request, actor, db)
    except HTTPException as exc:
        raise api_error(404, "publication_not_found", "Publication not found.", request=request) from exc
    return publication, membership


def role_can_activate_live_webhook(membership: Any) -> bool:
    return membership.role_key in CONTENT_PUBLISH_ROLES


def require_publish_role(membership: Any, request: Request) -> None:
    require_role(membership, CONTENT_PUBLISH_ROLES, request)


def require_preparation_role(membership: Any, request: Request) -> None:
    require_role(membership, CONTENT_PREPARATION_ROLES, request)


async def destination_for_publication_or_404(
    publication: Publication,
    request: Request,
    db: AsyncSession,
) -> ProjectDestination:
    destination = await db.get(ProjectDestination, publication.destination_id)
    if destination is None or destination.deleted_at is not None:
        raise api_error(404, "destination_not_found", "Destination not found.", request=request)
    return destination


async def require_publication_delivery_role(
    publication: Publication,
    membership: Any,
    request: Request,
    db: AsyncSession,
) -> ProjectDestination:
    destination = await destination_for_publication_or_404(publication, request, db)
    if destination.connector_key == "manual_export":
        require_preparation_role(membership, request)
    else:
        require_publish_role(membership, request)
    return destination


@router.post("/content-items/{content_id}/generate-variants", response_model=PlatformVariantsResponse)
async def generate_variants(
    content_id: UUID,
    payload: GenerateVariantsRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> PlatformVariantsResponse:
    item, membership = await item_for_actor(content_id, request, actor, db)
    require_preparation_role(membership, request)
    try:
        variants = await generate_variants_for_content(db, item, actor.user.id, payload.platform_keys)
    except PublicationCoreError as exc:
        raise handle_publication_error(exc, request) from exc
    await db.commit()
    return PlatformVariantsResponse(variants=[variant_out(variant) for variant in variants])


@router.get("/content-items/{content_id}/variants", response_model=PlatformVariantsResponse)
async def list_variants(
    content_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> PlatformVariantsResponse:
    item, membership = await item_for_actor(content_id, request, actor, db)
    require_role(membership, READ_ROLES, request)
    variants = await list_variants_for_content(db, item)
    return PlatformVariantsResponse(variants=[variant_out(variant) for variant in variants])


@router.get("/platform-variants/{variant_id}", response_model=PlatformVariantOut)
async def get_variant(
    variant_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> PlatformVariantOut:
    variant, membership = await variant_for_actor(variant_id, request, actor, db)
    require_role(membership, READ_ROLES, request)
    return variant_out(variant)


@router.patch("/platform-variants/{variant_id}", response_model=PlatformVariantOut)
async def patch_variant(
    variant_id: UUID,
    payload: PlatformVariantPatchRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> PlatformVariantOut:
    variant, membership = await variant_for_actor(variant_id, request, actor, db)
    require_preparation_role(membership, request)
    try:
        edited = await edit_platform_variant(db, variant, actor.user.id, payload.text)
    except PublicationCoreError as exc:
        raise handle_publication_error(exc, request) from exc
    await db.commit()
    return variant_out(edited)


@router.post("/platform-variants/{variant_id}/validate", response_model=PlatformVariantOut)
async def validate_variant_endpoint(
    variant_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> PlatformVariantOut:
    variant, membership = await variant_for_actor(variant_id, request, actor, db)
    require_preparation_role(membership, request)
    try:
        validated = await validate_platform_variant(db, variant)
    except PublicationCoreError as exc:
        raise handle_publication_error(exc, request) from exc
    await db.commit()
    return variant_out(validated)


@router.post("/platform-variants/{variant_id}/approve", response_model=PlatformVariantOut)
async def approve_variant_endpoint(
    variant_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> PlatformVariantOut:
    variant, membership = await variant_for_actor(variant_id, request, actor, db)
    require_publish_role(membership, request)
    try:
        approved = await approve_platform_variant(db, variant, actor.user.id)
    except PublicationCoreError as exc:
        raise handle_publication_error(exc, request) from exc
    await db.commit()
    return variant_out(approved)


@router.get("/projects/{project_id}/destinations", response_model=DestinationsResponse)
async def list_destinations(
    project_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> DestinationsResponse:
    project, membership = await project_for_actor(project_id, request, actor, db)
    require_role(membership, READ_ROLES, request)
    destinations = await list_project_destinations(db, project)
    return DestinationsResponse(destinations=[destination_out(destination) for destination in destinations])


@router.post("/projects/{project_id}/destinations", response_model=DestinationOut)
async def create_destination(
    project_id: UUID,
    payload: DestinationCreateRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> DestinationOut:
    project, membership = await project_for_actor(project_id, request, actor, db)
    require_preparation_role(membership, request)
    try:
        destination = await create_project_destination(
            db,
            project,
            actor.user.id,
            name=payload.name,
            platform_key=payload.platform_key,
            connector_key=payload.connector_key,
            configuration=payload.configuration,
            publication_mode=payload.publication_mode,
            can_activate_live=role_can_activate_live_webhook(membership),
        )
    except PublicationCoreError as exc:
        raise handle_publication_error(exc, request) from exc
    await db.commit()
    return destination_out(destination)


@router.patch("/destinations/{destination_id}", response_model=DestinationOut)
async def patch_destination(
    destination_id: UUID,
    payload: DestinationPatchRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> DestinationOut:
    destination, membership = await destination_for_actor(destination_id, request, actor, db)
    require_preparation_role(membership, request)
    try:
        updated = await update_project_destination(
            db,
            destination,
            name=payload.name,
            status=payload.status,
            configuration=payload.configuration,
            can_activate_live=role_can_activate_live_webhook(membership),
        )
    except PublicationCoreError as exc:
        raise handle_publication_error(exc, request) from exc
    await db.commit()
    return destination_out(updated)


@router.delete("/destinations/{destination_id}", response_model=MessageResponse)
async def delete_destination(
    destination_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    destination, membership = await destination_for_actor(destination_id, request, actor, db)
    require_publish_role(membership, request)
    destination.deleted_at = utc_now()
    destination.status = "disabled"
    await db.commit()
    return MessageResponse(status="ok", message="Destination disabled.")


@router.get("/destinations/{destination_id}/capabilities", response_model=CapabilityResponse)
async def get_destination_capabilities(
    destination_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> CapabilityResponse:
    destination, membership = await destination_for_actor(destination_id, request, actor, db)
    require_role(membership, READ_ROLES, request)
    await ensure_publication_catalog(db)
    capability = capability_for(destination.platform_key)
    return CapabilityResponse(
        platform_key=capability.platform_key,
        connector_key=destination.connector_key,
        name=capability.name,
        capabilities=capability.capabilities,
        hard_limits=capability.hard_limits,
        publication_mode=capability.publication_mode,
        automated_delivery=capability.automated_delivery,
    )


@router.post("/destinations/{destination_id}/test", response_model=DestinationTestResponse)
async def test_destination_endpoint(
    destination_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> DestinationTestResponse:
    destination, membership = await destination_for_actor(destination_id, request, actor, db)
    require_preparation_role(membership, request)
    try:
        result = test_destination(destination)
    except PublicationCoreError as exc:
        raise handle_publication_error(exc, request) from exc
    return DestinationTestResponse(**result)


@router.post("/platform-variants/{variant_id}/publications", response_model=PublicationOut)
async def create_publication_endpoint(
    variant_id: UUID,
    payload: PublicationCreateRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> PublicationOut:
    variant, membership = await variant_for_actor(variant_id, request, actor, db)
    destination, _ = await destination_for_actor(payload.destination_id, request, actor, db)
    if destination.connector_key == "manual_export":
        require_preparation_role(membership, request)
    else:
        require_publish_role(membership, request)
    key = payload.idempotency_key or request.headers.get("Idempotency-Key")
    try:
        publication = await create_publication(db, variant, destination, actor.user.id, key)
    except PublicationCoreError as exc:
        raise handle_publication_error(exc, request) from exc
    await db.commit()
    return await publication_out(db, publication)


@router.get("/publications", response_model=PublicationsResponse)
async def list_publications_endpoint(
    workspace_id: UUID,
    request: Request,
    project_id: UUID | None = None,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> PublicationsResponse:
    _, membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(membership, READ_ROLES, request)
    publications = await list_publications(db, workspace_id, project_id)
    return PublicationsResponse(publications=[await publication_out(db, row) for row in publications])


@router.get("/publications/{publication_id}", response_model=PublicationOut)
async def get_publication(
    publication_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> PublicationOut:
    publication, membership = await publication_for_actor(publication_id, request, actor, db)
    require_role(membership, READ_ROLES, request)
    return await publication_out(db, publication)


@router.post("/publications/{publication_id}/schedule", response_model=PublicationOut)
async def schedule_publication(
    publication_id: UUID,
    payload: PublicationScheduleRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> PublicationOut:
    publication, membership = await publication_for_actor(publication_id, request, actor, db)
    await require_publication_delivery_role(publication, membership, request, db)
    try:
        scheduled = await enqueue_publication(db, publication, payload.scheduled_at)
    except PublicationCoreError as exc:
        raise handle_publication_error(exc, request) from exc
    await db.commit()
    return await publication_out(db, scheduled)


@router.post("/publications/{publication_id}/publish-now", response_model=PublicationOut)
async def publish_now(
    publication_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> PublicationOut:
    publication, membership = await publication_for_actor(publication_id, request, actor, db)
    await require_publication_delivery_role(publication, membership, request, db)
    try:
        queued = await enqueue_publication(db, publication)
    except PublicationCoreError as exc:
        raise handle_publication_error(exc, request) from exc
    await db.commit()
    processed = await process_publication_outbox(db, queued)
    await db.commit()
    return await publication_out(db, processed)


@router.post("/publications/{publication_id}/cancel", response_model=PublicationOut)
async def cancel_publication_endpoint(
    publication_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> PublicationOut:
    publication, membership = await publication_for_actor(publication_id, request, actor, db)
    require_publish_role(membership, request)
    try:
        cancelled = await cancel_publication(db, publication)
    except PublicationCoreError as exc:
        raise handle_publication_error(exc, request) from exc
    await db.commit()
    return await publication_out(db, cancelled)


@router.post("/publications/{publication_id}/retry", response_model=PublicationOut)
async def retry_publication_endpoint(
    publication_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> PublicationOut:
    publication, membership = await publication_for_actor(publication_id, request, actor, db)
    await require_publication_delivery_role(publication, membership, request, db)
    retried = await retry_publication(db, publication)
    await db.commit()
    processed = await process_publication_outbox(db, retried)
    await db.commit()
    return await publication_out(db, processed)


@router.post("/publications/{publication_id}/refresh-status", response_model=PublicationOut)
async def refresh_publication_status(
    publication_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> PublicationOut:
    publication, membership = await publication_for_actor(publication_id, request, actor, db)
    require_role(membership, READ_ROLES, request)
    return await publication_out(db, publication)


@router.post("/publications/{publication_id}/edit", response_model=PublicationOut)
async def edit_publication_endpoint(
    publication_id: UUID,
    payload: PlatformVariantPatchRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> PublicationOut:
    publication, membership = await publication_for_actor(publication_id, request, actor, db)
    require_preparation_role(membership, request)
    variant = await db.get(PlatformVariant, publication.platform_variant_id)
    if variant is None:
        raise api_error(404, "variant_not_found", "Platform variant not found.", request=request)
    try:
        edited = await edit_platform_variant(db, variant, actor.user.id, payload.text)
        publication.platform_variant_id = edited.id
        publication.status = "draft"
    except PublicationCoreError as exc:
        raise handle_publication_error(exc, request) from exc
    await db.commit()
    return await publication_out(db, publication)


@router.delete("/publications/{publication_id}/external-post", response_model=PublicationOut)
async def delete_external_post_endpoint(
    publication_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> PublicationOut:
    publication, membership = await publication_for_actor(publication_id, request, actor, db)
    require_publish_role(membership, request)
    deleted = await mark_external_post_deleted(db, publication)
    await db.commit()
    return await publication_out(db, deleted)


@router.post("/publications/{publication_id}/confirm-manual", response_model=PublicationOut)
async def confirm_manual_publication_endpoint(
    publication_id: UUID,
    payload: ManualConfirmationRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> PublicationOut:
    publication, membership = await publication_for_actor(publication_id, request, actor, db)
    require_publish_role(membership, request)
    try:
        confirmed = await confirm_manual_publication(
            db,
            publication,
            actor.user.id,
            external_url=payload.external_url,
            external_post_id=payload.external_post_id,
            evidence=payload.evidence,
        )
    except PublicationCoreError as exc:
        raise handle_publication_error(exc, request) from exc
    await db.commit()
    return await publication_out(db, confirmed)


@router.get("/publications/{publication_id}/attempts", response_model=AttemptsResponse)
async def list_publication_attempts(
    publication_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> AttemptsResponse:
    publication, membership = await publication_for_actor(publication_id, request, actor, db)
    require_role(membership, READ_ROLES, request)
    attempts = await attempts_for_publication(db, publication)
    return AttemptsResponse(attempts=[attempt_out(attempt) for attempt in attempts])


@router.post("/webhooks/generic/{destination_id}", response_model=WebhookInboxOut)
async def generic_webhook_callback(
    destination_id: UUID,
    payload: WebhookCallbackRequest,
    request: Request,
    db: AsyncSession = Depends(get_session),
) -> WebhookInboxOut:
    destination = await db.get(ProjectDestination, destination_id)
    if destination is None or destination.deleted_at is not None:
        raise api_error(404, "destination_not_found", "Destination not found.", request=request)
    headers = {key: value for key, value in request.headers.items() if key.lower().startswith("x-")}
    inbox = await record_webhook_inbox(
        db,
        destination,
        payload={"event_type": payload.event_type, **payload.payload},
        headers=headers,
        dedupe_key=payload.dedupe_key,
        signature_valid=payload.signature_valid,
    )
    await db.commit()
    return webhook_inbox_out(inbox)
