from __future__ import annotations

import asyncio
import os
import socket
import sys
from datetime import timedelta
from pathlib import Path
from uuid import UUID

from celery.utils.log import get_task_logger
from sqlalchemy import select, update

API_ROOT = Path(__file__).resolve().parents[3] / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.db.base import OutboxEvent, Publication, utc_now  # noqa: E402
from app.db.session import AsyncSessionLocal, engine  # noqa: E402
from app.modules.publications.service import process_publication_outbox  # noqa: E402
from worker_app.celery_app import celery_app  # noqa: E402

logger = get_task_logger(__name__)


async def requeue_stale_publication_events(stale_seconds: int) -> int:
    stale_before = utc_now() - timedelta(seconds=stale_seconds)
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(OutboxEvent)
            .where(
                OutboxEvent.aggregate_type == "publication",
                OutboxEvent.event_type == "publication.publish",
                OutboxEvent.status == "processing",
                OutboxEvent.locked_at.is_not(None),
                OutboxEvent.locked_at < stale_before,
            )
            .values(
                available_at=utc_now(),
                error_code="publication_worker_lease_expired",
                error_message="Background publication processing was safely resumed.",
                locked_at=None,
                locked_by=None,
                status="pending",
                updated_at=utc_now(),
            )
        )
        await session.commit()
        return int(result.rowcount or 0)


async def due_publication_ids(batch_size: int) -> list[UUID]:
    async with AsyncSessionLocal() as session:
        rows = (
            await session.scalars(
                select(OutboxEvent.aggregate_id)
                .where(
                    OutboxEvent.aggregate_type == "publication",
                    OutboxEvent.event_type == "publication.publish",
                    OutboxEvent.status == "pending",
                    OutboxEvent.available_at <= utc_now(),
                )
                .order_by(OutboxEvent.available_at.asc(), OutboxEvent.created_at.asc())
                .limit(batch_size)
            )
        ).all()
    return list(dict.fromkeys(rows))


async def mark_missing_publication(publication_id: UUID, worker_id: str) -> None:
    async with AsyncSessionLocal() as session:
        event = await session.scalar(
            select(OutboxEvent)
            .where(
                OutboxEvent.aggregate_type == "publication",
                OutboxEvent.aggregate_id == publication_id,
                OutboxEvent.event_type == "publication.publish",
                OutboxEvent.status == "pending",
            )
            .order_by(OutboxEvent.created_at.asc())
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        if event is None:
            return
        event.attempt_count += 1
        event.error_code = "publication_missing"
        event.error_message = "Publication record is missing."
        event.locked_at = utc_now()
        event.locked_by = worker_id
        event.status = "dead_letter"
        event.updated_at = utc_now()
        await session.commit()


async def drain_publication_outbox() -> dict[str, int]:
    settings = get_settings()
    worker_id = f"{socket.gethostname()}:{os.getpid()}"
    recovered = await requeue_stale_publication_events(settings.publication_outbox_stale_seconds)
    publication_ids = await due_publication_ids(settings.publication_outbox_batch_size)
    processed = 0
    failed = 0

    for publication_id in publication_ids:
        async with AsyncSessionLocal() as session:
            try:
                publication = await session.get(Publication, publication_id)
                if publication is None:
                    await session.rollback()
                    await mark_missing_publication(publication_id, worker_id)
                    failed += 1
                    continue
                await process_publication_outbox(session, publication, worker_id=worker_id)
                await session.commit()
                processed += 1
            except Exception:
                await session.rollback()
                failed += 1
                logger.exception("Publication outbox item failed", extra={"publication_id": str(publication_id)})

    return {
        "failed": failed,
        "processed": processed,
        "recovered": recovered,
        "selected": len(publication_ids),
    }


async def _run_and_dispose() -> dict[str, int]:
    try:
        return await drain_publication_outbox()
    finally:
        await engine.dispose()


@celery_app.task(name="publications.drain_outbox")
def drain_outbox_task() -> dict[str, int]:
    return asyncio.run(_run_and_dispose())
