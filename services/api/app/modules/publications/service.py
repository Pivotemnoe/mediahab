from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import (
    ContentItem,
    ContentMedia,
    ContentRevision,
    ExternalPost,
    MediaAsset,
    OutboxEvent,
    Platform,
    PlatformCapability,
    PlatformVariant,
    Project,
    ProjectDestination,
    Publication,
    PublicationAttempt,
    WebhookInbox,
    utc_now,
)
from app.modules.publications.connectors import (
    ConnectorValidationError,
    adapt_text_for_platform,
    all_capabilities,
    capability_for,
    publish_connector,
    redacted_destination_configuration,
    validate_destination_configuration,
    validate_variant,
)


CONTENT_PREPARATION_ROLES = {"owner", "admin", "editor"}
CONTENT_PUBLISH_ROLES = {"owner", "admin"}
READ_ROLES = {"owner", "admin", "editor", "viewer"}
DEFAULT_VARIANT_PLATFORMS = ["telegram", "max", "instagram", "manual_export", "generic_webhook"]
OUTBOX_BEAT_INTERVAL_SECONDS = 2
OUTBOX_BATCH_SIZE = 100
OUTBOX_LEASE_SECONDS = 60
OUTBOX_WATCHDOG_INTERVAL_SECONDS = 60
OUTBOX_RETRY_DELAYS_SECONDS = [5, 30, 120, 600, 1800, 7200, 21600, 43200]
OUTBOX_MAX_ATTEMPTS = len(OUTBOX_RETRY_DELAYS_SECONDS) + 1


def retry_delay_seconds(attempt_count: int, response_payload: dict[str, Any] | None = None) -> int:
    retry_after = None
    if isinstance(response_payload, dict):
        retry_after = response_payload.get("retry_after_seconds")
    try:
        retry_after_seconds = int(retry_after) if retry_after is not None else None
    except (TypeError, ValueError):
        retry_after_seconds = None
    index = max(0, min(attempt_count - 1, len(OUTBOX_RETRY_DELAYS_SECONDS) - 1))
    cadence_seconds = OUTBOX_RETRY_DELAYS_SECONDS[index]
    if retry_after_seconds is None:
        return cadence_seconds
    return max(cadence_seconds, retry_after_seconds)


class PublicationCoreError(RuntimeError):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


def _connector_error_to_publication_error(exc: ConnectorValidationError) -> PublicationCoreError:
    return PublicationCoreError(422, exc.code, exc.message, exc.details)


def normalize_scheduled_at(value: datetime, workspace_timezone: str | None = None) -> datetime:
    timezone_name = workspace_timezone or "UTC"
    if value.tzinfo is None or value.utcoffset() is None:
        try:
            zone = ZoneInfo(timezone_name)
        except ZoneInfoNotFoundError as exc:
            raise PublicationCoreError(
                422,
                "workspace_timezone_invalid",
                "Workspace timezone is not a valid IANA timezone.",
                {"timezone": timezone_name},
            ) from exc
        value = value.replace(tzinfo=zone)
    return value.astimezone(timezone.utc)


async def ensure_publication_catalog(session: AsyncSession) -> None:
    for capability in all_capabilities():
        platform = await session.get(Platform, capability.platform_key)
        if platform is None:
            platform = Platform(
                key=capability.platform_key,
                name=capability.name,
                status="active",
                native_enabled=capability.automated_delivery,
                created_at=utc_now(),
                updated_at=utc_now(),
            )
            session.add(platform)
        else:
            platform.name = capability.name
            platform.native_enabled = capability.automated_delivery
            platform.updated_at = utc_now()
        existing = await session.scalar(
            select(PlatformCapability).where(
                PlatformCapability.platform_key == capability.platform_key,
                PlatformCapability.connector_key == capability.connector_key,
                PlatformCapability.version == 1,
            )
        )
        if existing is None:
            session.add(
                PlatformCapability(
                    id=uuid4(),
                    platform_key=capability.platform_key,
                    connector_key=capability.connector_key,
                    version=1,
                    capabilities_json=capability.capabilities,
                    hard_limits_json=capability.hard_limits,
                    status="active",
                    created_at=utc_now(),
                    updated_at=utc_now(),
                )
            )
    await session.flush()


async def master_revision_for_content(
    session: AsyncSession,
    item: ContentItem,
) -> ContentRevision:
    if item.current_master_revision_id is None:
        raise PublicationCoreError(
            422,
            "master_revision_required",
            "Content item has no approved master revision for platform variants.",
        )
    revision = await session.get(ContentRevision, item.current_master_revision_id)
    if revision is None or revision.content_item_id != item.id:
        raise PublicationCoreError(
            422,
            "master_revision_missing",
            "Current master revision is missing or does not belong to this content item.",
        )
    return revision


async def media_count_for_content(session: AsyncSession, content_id: UUID) -> int:
    count = await session.scalar(
        select(func.count(ContentMedia.id)).where(ContentMedia.content_item_id == content_id)
    )
    return int(count or 0)


async def ordered_media_for_content(session: AsyncSession, content_id: UUID) -> list[dict[str, Any]]:
    rows = (
        await session.execute(
            select(ContentMedia, MediaAsset)
            .join(MediaAsset, MediaAsset.id == ContentMedia.media_asset_id)
            .where(
                ContentMedia.content_item_id == content_id,
                MediaAsset.deleted_at.is_(None),
            )
            .order_by(ContentMedia.sort_order.asc())
        )
    ).all()
    media_items: list[dict[str, Any]] = []
    for row, media in rows:
        public_url = None
        metadata = media.codec_metadata if isinstance(media.codec_metadata, dict) else {}
        if isinstance(metadata, dict):
            public_url = metadata.get("public_url")
        media_items.append(
            {
                "content_media_id": str(row.id),
                "media_id": str(media.id),
                "storage_key": media.storage_key,
                "bucket": media.bucket,
                "kind": media.kind,
                "mime_type": media.mime_type,
                "size_bytes": media.size_bytes,
                "sort_order": row.sort_order,
                "role": row.role,
                "caption": row.caption,
                "public_url": public_url,
            }
        )
    return media_items


async def next_variant_revision_number(
    session: AsyncSession,
    content_id: UUID,
    master_revision_id: UUID,
    platform_key: str,
) -> int:
    latest = await session.scalar(
        select(func.max(PlatformVariant.revision_number)).where(
            PlatformVariant.content_item_id == content_id,
            PlatformVariant.master_revision_id == master_revision_id,
            PlatformVariant.platform_key == platform_key,
        )
    )
    return int(latest or 0) + 1


async def active_variant_for_platform(
    session: AsyncSession,
    content_id: UUID,
    master_revision_id: UUID,
    platform_key: str,
) -> PlatformVariant | None:
    return await session.scalar(
        select(PlatformVariant)
        .where(
            PlatformVariant.content_item_id == content_id,
            PlatformVariant.master_revision_id == master_revision_id,
            PlatformVariant.platform_key == platform_key,
            PlatformVariant.status != "superseded",
        )
        .order_by(PlatformVariant.revision_number.desc())
        .limit(1)
    )


async def create_platform_variant(
    session: AsyncSession,
    item: ContentItem,
    master_revision: ContentRevision,
    platform_key: str,
    actor_user_id: UUID,
    text_override: str | None = None,
    parent_variant_id: UUID | None = None,
) -> PlatformVariant:
    try:
        capability = capability_for(platform_key)
    except ConnectorValidationError as exc:
        raise _connector_error_to_publication_error(exc) from exc
    media_count = await media_count_for_content(session, item.id)
    text = text_override if text_override is not None else adapt_text_for_platform(master_revision.text, platform_key)
    validation = validate_variant(platform_key, text, media_count)
    revision_number = await next_variant_revision_number(session, item.id, master_revision.id, platform_key)
    now = utc_now()
    variant = PlatformVariant(
        id=uuid4(),
        workspace_id=item.workspace_id,
        content_item_id=item.id,
        master_revision_id=master_revision.id,
        platform_key=platform_key,
        revision_number=revision_number,
        status="draft",
        text=text,
        rendered_text=text,
        payload_json={
            "source": "master_revision",
            "master_revision_id": str(master_revision.id),
            "platform_key": platform_key,
            "connector_key": capability.connector_key,
            "publication_mode": capability.publication_mode,
            "hard_limits": capability.hard_limits,
        },
        validation_json=validation,
        character_count=len(text),
        parent_variant_id=parent_variant_id,
        created_by=actor_user_id,
        created_at=now,
        updated_at=now,
    )
    session.add(variant)
    await session.flush()
    return variant


async def generate_variants_for_content(
    session: AsyncSession,
    item: ContentItem,
    actor_user_id: UUID,
    platform_keys: list[str] | None = None,
) -> list[PlatformVariant]:
    await ensure_publication_catalog(session)
    master_revision = await master_revision_for_content(session, item)
    keys = platform_keys or DEFAULT_VARIANT_PLATFORMS
    variants: list[PlatformVariant] = []
    for platform_key in keys:
        existing = await active_variant_for_platform(session, item.id, master_revision.id, platform_key)
        if existing is not None:
            variants.append(existing)
            continue
        variants.append(
            await create_platform_variant(session, item, master_revision, platform_key, actor_user_id)
        )
    return variants


async def list_variants_for_content(session: AsyncSession, item: ContentItem) -> list[PlatformVariant]:
    return (
        await session.scalars(
            select(PlatformVariant)
            .where(PlatformVariant.content_item_id == item.id)
            .order_by(PlatformVariant.platform_key, PlatformVariant.revision_number.desc())
        )
    ).all()


async def validate_platform_variant(
    session: AsyncSession,
    variant: PlatformVariant,
) -> PlatformVariant:
    media_count = await media_count_for_content(session, variant.content_item_id)
    try:
        validation = validate_variant(variant.platform_key, variant.text, media_count)
    except ConnectorValidationError as exc:
        raise _connector_error_to_publication_error(exc) from exc
    variant.validation_json = validation
    variant.character_count = len(variant.text)
    variant.updated_at = utc_now()
    if variant.status not in {"approved", "superseded"}:
        variant.status = "valid" if validation["valid"] else "invalid"
    await session.flush()
    return variant


async def approve_platform_variant(
    session: AsyncSession,
    variant: PlatformVariant,
    actor_user_id: UUID,
) -> PlatformVariant:
    await validate_platform_variant(session, variant)
    validation = variant.validation_json if isinstance(variant.validation_json, dict) else {}
    if not validation.get("valid", False):
        raise PublicationCoreError(
            422,
            "variant_invalid",
            "Only a valid platform variant can be approved.",
            {"validation": validation},
        )
    older_approved = (
        await session.scalars(
            select(PlatformVariant).where(
                PlatformVariant.id != variant.id,
                PlatformVariant.content_item_id == variant.content_item_id,
                PlatformVariant.master_revision_id == variant.master_revision_id,
                PlatformVariant.platform_key == variant.platform_key,
                PlatformVariant.status == "approved",
            )
        )
    ).all()
    for older in older_approved:
        older.status = "superseded"
        older.superseded_by_variant_id = variant.id
        older.updated_at = utc_now()
    variant.status = "approved"
    variant.approved_by = actor_user_id
    variant.approved_at = utc_now()
    variant.updated_at = utc_now()
    await session.flush()
    return variant


async def edit_platform_variant(
    session: AsyncSession,
    variant: PlatformVariant,
    actor_user_id: UUID,
    text: str,
) -> PlatformVariant:
    item = await session.get(ContentItem, variant.content_item_id)
    master = await session.get(ContentRevision, variant.master_revision_id)
    if item is None or master is None:
        raise PublicationCoreError(404, "variant_not_found", "Platform variant context not found.")
    edited = await create_platform_variant(
        session,
        item,
        master,
        variant.platform_key,
        actor_user_id,
        text_override=text,
        parent_variant_id=variant.id,
    )
    if variant.status != "superseded":
        variant.status = "superseded"
        variant.superseded_by_variant_id = edited.id
        variant.updated_at = utc_now()
    await session.flush()
    return edited


def connector_key_allowed(platform_key: str, connector_key: str) -> bool:
    try:
        capability = capability_for(platform_key)
    except ConnectorValidationError:
        return False
    return connector_key in {capability.connector_key, "manual_export", "generic_webhook"}


async def create_project_destination(
    session: AsyncSession,
    project: Project,
    actor_user_id: UUID,
    *,
    name: str,
    platform_key: str,
    connector_key: str | None,
    configuration: dict[str, Any],
    publication_mode: str | None = None,
    can_activate_live: bool = False,
) -> ProjectDestination:
    await ensure_publication_catalog(session)
    try:
        capability = capability_for(platform_key)
    except ConnectorValidationError as exc:
        raise _connector_error_to_publication_error(exc) from exc
    selected_connector = connector_key or capability.connector_key
    if not connector_key_allowed(platform_key, selected_connector):
        raise PublicationCoreError(
            422,
            "unsupported_connector",
            "Connector is not supported for this platform in Phase 06.",
            {"platform_key": platform_key, "connector_key": selected_connector},
        )
    try:
        validate_destination_configuration(
            selected_connector,
            configuration,
            can_activate_live=can_activate_live,
        )
    except ConnectorValidationError as exc:
        raise _connector_error_to_publication_error(exc) from exc
    now = utc_now()
    destination = ProjectDestination(
        id=uuid4(),
        workspace_id=project.workspace_id,
        project_id=project.id,
        platform_key=platform_key,
        connector_key=selected_connector,
        name=name,
        status="active",
        publication_mode=publication_mode or capability.publication_mode,
        configuration_json=configuration,
        created_by=actor_user_id,
        created_at=now,
        updated_at=now,
        version=1,
    )
    session.add(destination)
    await session.flush()
    return destination


async def update_project_destination(
    session: AsyncSession,
    destination: ProjectDestination,
    *,
    name: str | None = None,
    status: str | None = None,
    configuration: dict[str, Any] | None = None,
    can_activate_live: bool = False,
) -> ProjectDestination:
    if name is not None:
        destination.name = name
    if status is not None:
        destination.status = status
    if configuration is not None:
        try:
            validate_destination_configuration(
                destination.connector_key,
                configuration,
                can_activate_live=can_activate_live,
            )
        except ConnectorValidationError as exc:
            raise _connector_error_to_publication_error(exc) from exc
        destination.configuration_json = configuration
    destination.updated_at = utc_now()
    destination.version += 1
    await session.flush()
    return destination


async def list_project_destinations(
    session: AsyncSession,
    project: Project,
) -> list[ProjectDestination]:
    return (
        await session.scalars(
            select(ProjectDestination)
            .where(
                ProjectDestination.project_id == project.id,
                ProjectDestination.deleted_at.is_(None),
            )
            .order_by(ProjectDestination.created_at.desc())
        )
    ).all()


def test_destination(destination: ProjectDestination) -> dict[str, Any]:
    configuration = destination.configuration_json
    if not isinstance(configuration, dict):
        configuration = {}
    try:
        validate_destination_configuration(destination.connector_key, configuration)
    except ConnectorValidationError as exc:
        raise _connector_error_to_publication_error(exc) from exc
    return {
        "ok": True,
        "connector_key": destination.connector_key,
        "configuration": redacted_destination_configuration(configuration),
        "message": "Destination configuration passed Phase 06 validation.",
    }


async def create_publication(
    session: AsyncSession,
    variant: PlatformVariant,
    destination: ProjectDestination,
    actor_user_id: UUID,
    idempotency_key: str | None = None,
) -> Publication:
    if variant.status != "approved":
        raise PublicationCoreError(
            422,
            "variant_approval_required",
            "Only an approved immutable variant can be queued for publication.",
            {"variant_status": variant.status},
        )
    if destination.status != "active" or destination.deleted_at is not None:
        raise PublicationCoreError(422, "destination_inactive", "Destination is not active.")
    if variant.workspace_id != destination.workspace_id:
        raise PublicationCoreError(404, "destination_not_found", "Destination not found.")
    if variant.platform_key != destination.platform_key and destination.connector_key != "manual_export":
        raise PublicationCoreError(
            422,
            "destination_platform_mismatch",
            "Destination platform does not match the approved variant.",
            {"variant_platform": variant.platform_key, "destination_platform": destination.platform_key},
        )
    publication_key = idempotency_key or f"publication:{variant.id}:{destination.id}"
    existing = await session.scalar(
        select(Publication).where(
            Publication.workspace_id == variant.workspace_id,
            Publication.idempotency_key == publication_key,
        )
    )
    if existing is not None:
        return existing
    now = utc_now()
    publication = Publication(
        id=uuid4(),
        workspace_id=variant.workspace_id,
        project_id=destination.project_id,
        content_item_id=variant.content_item_id,
        platform_variant_id=variant.id,
        destination_id=destination.id,
        status="draft",
        idempotency_key=publication_key,
        created_by=actor_user_id,
        created_at=now,
        updated_at=now,
        version=1,
    )
    session.add(publication)
    await session.flush()
    return publication


async def enqueue_publication(
    session: AsyncSession,
    publication: Publication,
    scheduled_at: datetime | None = None,
    workspace_timezone: str | None = None,
) -> Publication:
    if publication.status in {"published", "manual_required"}:
        return publication
    if publication.status == "cancelled":
        raise PublicationCoreError(422, "publication_cancelled", "Cancelled publication cannot be queued.")
    now = utc_now()
    normalized_schedule = normalize_scheduled_at(scheduled_at, workspace_timezone) if scheduled_at else None
    publication.status = "scheduled" if scheduled_at else "queued"
    publication.scheduled_at = normalized_schedule
    publication.queued_at = None if scheduled_at else now
    publication.updated_at = now
    publication.version += 1
    existing_event = await session.scalar(
        select(OutboxEvent)
        .where(
            OutboxEvent.aggregate_type == "publication",
            OutboxEvent.aggregate_id == publication.id,
            OutboxEvent.event_type == "publication.publish",
            OutboxEvent.status.in_(["pending", "processing"]),
        )
        .limit(1)
    )
    if existing_event is None:
        session.add(
            OutboxEvent(
                id=uuid4(),
                workspace_id=publication.workspace_id,
                aggregate_type="publication",
                aggregate_id=publication.id,
                event_type="publication.publish",
                payload_json={"publication_id": str(publication.id)},
                status="pending",
                attempt_count=0,
                max_attempts=OUTBOX_MAX_ATTEMPTS,
                available_at=normalized_schedule or now,
                created_at=now,
                updated_at=now,
            )
        )
    await session.flush()
    return publication


async def reschedule_publication(
    session: AsyncSession,
    publication: Publication,
    scheduled_at: datetime,
    workspace_timezone: str | None = None,
) -> Publication:
    if publication.status == "published":
        raise PublicationCoreError(422, "publication_already_published", "Published publication cannot be rescheduled.")
    if publication.status == "cancelled":
        raise PublicationCoreError(422, "publication_cancelled", "Cancelled publication cannot be rescheduled.")
    normalized_schedule = normalize_scheduled_at(scheduled_at, workspace_timezone)
    now = utc_now()
    publication.status = "scheduled"
    publication.scheduled_at = normalized_schedule
    publication.queued_at = None
    publication.updated_at = now
    publication.version += 1
    event = await session.scalar(
        select(OutboxEvent)
        .where(
            OutboxEvent.aggregate_type == "publication",
            OutboxEvent.aggregate_id == publication.id,
            OutboxEvent.event_type == "publication.publish",
            OutboxEvent.status == "pending",
        )
        .order_by(OutboxEvent.created_at.asc())
        .limit(1)
    )
    if event is None:
        session.add(
            OutboxEvent(
                id=uuid4(),
                workspace_id=publication.workspace_id,
                aggregate_type="publication",
                aggregate_id=publication.id,
                event_type="publication.publish",
                payload_json={"publication_id": str(publication.id), "rescheduled": True},
                status="pending",
                attempt_count=0,
                max_attempts=OUTBOX_MAX_ATTEMPTS,
                available_at=normalized_schedule,
                created_at=now,
                updated_at=now,
            )
        )
    else:
        event.available_at = normalized_schedule
        event.locked_at = None
        event.locked_by = None
        event.updated_at = now
        payload = event.payload_json if isinstance(event.payload_json, dict) else {}
        event.payload_json = {**payload, "publication_id": str(publication.id), "rescheduled": True}
    await session.flush()
    return publication


async def next_attempt_number(session: AsyncSession, publication_id: UUID) -> int:
    latest = await session.scalar(
        select(func.max(PublicationAttempt.attempt_number)).where(
            PublicationAttempt.publication_id == publication_id
        )
    )
    return int(latest or 0) + 1


async def external_post_for_publication(
    session: AsyncSession,
    publication: Publication,
) -> ExternalPost | None:
    return await session.scalar(
        select(ExternalPost).where(
            ExternalPost.publication_id == publication.id,
            ExternalPost.idempotency_key == publication.idempotency_key,
        )
    )


async def process_publication_outbox(
    session: AsyncSession,
    publication: Publication,
    worker_id: str = "api-inline",
) -> Publication:
    now = utc_now()
    event = await session.scalar(
        select(OutboxEvent)
        .where(
            OutboxEvent.aggregate_type == "publication",
            OutboxEvent.aggregate_id == publication.id,
            OutboxEvent.event_type == "publication.publish",
            OutboxEvent.status == "pending",
            OutboxEvent.available_at <= now,
        )
        .order_by(OutboxEvent.created_at.asc())
        .limit(1)
    )
    if event is None:
        return publication
    event.status = "processing"
    event.locked_at = now
    event.locked_by = worker_id
    event.attempt_count += 1
    event.updated_at = now
    if publication.status == "cancelled":
        event.status = "completed"
        event.processed_at = now
        await session.flush()
        return publication
    existing_external = await external_post_for_publication(session, publication)
    if existing_external is not None and publication.status in {"published", "manual_required"}:
        event.status = "completed"
        event.processed_at = now
        event.updated_at = now
        await session.flush()
        return publication
    variant = await session.get(PlatformVariant, publication.platform_variant_id)
    destination = await session.get(ProjectDestination, publication.destination_id)
    if variant is None or destination is None:
        event.status = "dead_letter"
        event.error_code = "publication_context_missing"
        event.error_message = "Variant or destination is missing."
        publication.status = "failed_permanent"
        publication.last_error_code = event.error_code
        publication.last_error_message = event.error_message
        await session.flush()
        return publication
    configuration = destination.configuration_json if isinstance(destination.configuration_json, dict) else {}
    media_items = await ordered_media_for_content(session, publication.content_item_id)
    request_payload = {
        "publication_id": str(publication.id),
        "variant_id": str(variant.id),
        "destination_id": str(destination.id),
        "platform_key": variant.platform_key,
        "connector_key": destination.connector_key,
        "text": variant.text,
        "media_items": media_items,
        "configuration": redacted_destination_configuration(configuration),
    }
    attempt = PublicationAttempt(
        id=uuid4(),
        workspace_id=publication.workspace_id,
        publication_id=publication.id,
        destination_id=destination.id,
        connector_key=destination.connector_key,
        attempt_number=await next_attempt_number(session, publication.id),
        status="started",
        retryable=False,
        request_payload_json=request_payload,
        started_at=now,
        created_at=now,
    )
    session.add(attempt)
    publication.status = "publishing"
    publication.updated_at = now
    await session.flush()
    result = await publish_connector(
        publication_id=str(publication.id),
        destination_id=str(destination.id),
        platform_key=variant.platform_key,
        connector_key=destination.connector_key,
        text=variant.text,
        configuration=configuration,
        idempotency_key=publication.idempotency_key or str(publication.id),
        media_items=media_items,
    )
    completed_at = utc_now()
    attempt.status = result.status
    attempt.retryable = result.retryable
    attempt.response_payload_json = result.response_payload
    attempt.error_code = result.error_code
    attempt.error_message = result.error_message
    attempt.completed_at = completed_at
    publication.status = result.status
    publication.updated_at = completed_at
    publication.version += 1
    if result.status in {"published", "manual_required"}:
        if result.status == "published":
            publication.published_at = completed_at
        publication.last_error_code = None
        publication.last_error_message = None
        if result.external_id is not None and existing_external is None:
            session.add(
                ExternalPost(
                    id=uuid4(),
                    workspace_id=publication.workspace_id,
                    publication_id=publication.id,
                    destination_id=destination.id,
                    connector_key=destination.connector_key,
                    provider_external_id=result.external_id,
                    permalink_url=None,
                    status=result.status,
                    idempotency_key=publication.idempotency_key or str(publication.id),
                    payload_json=result.response_payload,
                    created_at=completed_at,
                    updated_at=completed_at,
                )
            )
        event.status = "completed"
        event.processed_at = completed_at
    else:
        publication.last_error_code = result.error_code
        publication.last_error_message = result.error_message
        if result.retryable and event.attempt_count < event.max_attempts:
            event.status = "pending"
            event.locked_at = None
            event.locked_by = None
            event.available_at = completed_at + timedelta(
                seconds=retry_delay_seconds(event.attempt_count, result.response_payload)
            )
        else:
            event.status = "dead_letter"
        event.error_code = result.error_code
        event.error_message = result.error_message
    event.updated_at = completed_at
    await session.flush()
    return publication


async def retry_publication(session: AsyncSession, publication: Publication) -> Publication:
    existing_external = await external_post_for_publication(session, publication)
    if existing_external is not None and publication.status in {"published", "manual_required"}:
        return publication
    publication.status = "queued"
    publication.queued_at = utc_now()
    publication.updated_at = utc_now()
    publication.version += 1
    session.add(
        OutboxEvent(
            id=uuid4(),
            workspace_id=publication.workspace_id,
            aggregate_type="publication",
            aggregate_id=publication.id,
            event_type="publication.publish",
            payload_json={"publication_id": str(publication.id), "retry": True},
            status="pending",
            attempt_count=0,
            max_attempts=OUTBOX_MAX_ATTEMPTS,
            available_at=utc_now(),
            created_at=utc_now(),
            updated_at=utc_now(),
        )
    )
    await session.flush()
    return publication


async def cancel_publication(session: AsyncSession, publication: Publication) -> Publication:
    if publication.status == "published":
        raise PublicationCoreError(422, "publication_already_published", "Published publication cannot be cancelled.")
    now = utc_now()
    publication.status = "cancelled"
    publication.cancelled_at = now
    publication.updated_at = now
    publication.version += 1
    pending_events = (
        await session.scalars(
            select(OutboxEvent).where(
                OutboxEvent.aggregate_type == "publication",
                OutboxEvent.aggregate_id == publication.id,
                OutboxEvent.status == "pending",
            )
        )
    ).all()
    for event in pending_events:
        event.status = "completed"
        event.processed_at = now
        event.updated_at = now
    await session.flush()
    return publication


async def list_publications(
    session: AsyncSession,
    workspace_id: UUID,
    project_id: UUID | None = None,
) -> list[Publication]:
    statement = select(Publication).where(Publication.workspace_id == workspace_id)
    if project_id is not None:
        statement = statement.where(Publication.project_id == project_id)
    return (await session.scalars(statement.order_by(Publication.created_at.desc()))).all()


async def attempts_for_publication(
    session: AsyncSession,
    publication: Publication,
) -> list[PublicationAttempt]:
    return (
        await session.scalars(
            select(PublicationAttempt)
            .where(PublicationAttempt.publication_id == publication.id)
            .order_by(PublicationAttempt.attempt_number.asc())
        )
    ).all()


async def external_posts_for_publication(
    session: AsyncSession,
    publication: Publication,
) -> list[ExternalPost]:
    return (
        await session.scalars(
            select(ExternalPost)
            .where(ExternalPost.publication_id == publication.id)
            .order_by(ExternalPost.created_at.asc())
        )
    ).all()


async def mark_external_post_deleted(
    session: AsyncSession,
    publication: Publication,
) -> Publication:
    posts = await external_posts_for_publication(session, publication)
    now = utc_now()
    for post in posts:
        post.status = "deleted"
        post.updated_at = now
    publication.status = "deleted"
    publication.updated_at = now
    publication.version += 1
    await session.flush()
    return publication


async def confirm_manual_publication(
    session: AsyncSession,
    publication: Publication,
    actor_user_id: UUID,
    *,
    external_url: str | None = None,
    external_post_id: str | None = None,
    evidence: dict[str, Any] | None = None,
) -> Publication:
    if publication.status != "manual_required":
        raise PublicationCoreError(
            422,
            "manual_confirmation_not_allowed",
            "Only a manual_required publication can be confirmed manually.",
            {"publication_status": publication.status},
        )
    now = utc_now()
    publication.status = "published"
    publication.publication_method = "manual"
    publication.confirmed_by = actor_user_id
    publication.confirmed_at = now
    publication.published_at = now
    publication.external_url = external_url
    publication.external_post_id = external_post_id
    publication.confirmation_evidence_json = evidence
    publication.updated_at = now
    publication.version += 1
    posts = await external_posts_for_publication(session, publication)
    for post in posts:
        post.status = "published"
        post.permalink_url = external_url or post.permalink_url
        if external_post_id:
            post.provider_external_id = external_post_id
        post.updated_at = now
    await session.flush()
    return publication


async def record_webhook_inbox(
    session: AsyncSession,
    destination: ProjectDestination,
    *,
    payload: dict[str, Any],
    headers: dict[str, Any],
    dedupe_key: str | None,
    signature_valid: bool,
) -> WebhookInbox:
    inbox = WebhookInbox(
        id=uuid4(),
        workspace_id=destination.workspace_id,
        destination_id=destination.id,
        connector_key=destination.connector_key,
        event_type=str(payload.get("event_type") or "generic_webhook"),
        payload_json=payload,
        headers_json=headers,
        signature_valid=signature_valid,
        dedupe_key=dedupe_key,
        status="received",
        received_at=utc_now(),
    )
    session.add(inbox)
    await session.flush()
    return inbox
