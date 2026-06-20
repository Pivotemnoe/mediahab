from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Entitlement, Membership, Plan, Subscription, UsageEvent


async def get_workspace_subscription(
    session: AsyncSession, workspace_id: UUID
) -> tuple[Subscription, Plan] | None:
    row = (
        await session.execute(
            select(Subscription, Plan)
            .join(Plan, Plan.id == Subscription.plan_id)
            .where(Subscription.workspace_id == workspace_id)
        )
    ).first()
    if row is None:
        return None
    subscription, plan = row
    return subscription, plan


async def entitlement_value(
    session: AsyncSession, workspace_id: UUID, key: str, default: Any = None
) -> Any:
    subscription = await get_workspace_subscription(session, workspace_id)
    if subscription is None:
        return default
    _, plan = subscription
    entitlement = await session.scalar(
        select(Entitlement).where(
            Entitlement.plan_id == plan.id,
            Entitlement.key == key,
        )
    )
    return entitlement.value_json if entitlement is not None else default


async def current_team_seats(session: AsyncSession, workspace_id: UUID) -> int:
    return int(
        await session.scalar(
            select(func.count()).select_from(Membership).where(Membership.workspace_id == workspace_id)
        )
        or 0
    )


async def usage_totals(session: AsyncSession, workspace_id: UUID) -> dict[str, float]:
    rows = await session.execute(
        select(UsageEvent.key, func.coalesce(func.sum(UsageEvent.quantity), 0))
        .where(UsageEvent.workspace_id == workspace_id)
        .group_by(UsageEvent.key)
    )
    return {key: float(total) for key, total in rows.all()}
