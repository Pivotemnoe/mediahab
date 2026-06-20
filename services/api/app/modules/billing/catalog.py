from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Entitlement, Plan, Price, Role, utc_now

ROLE_SEED = [
    ("owner", "Owner", "Full workspace and billing control.", True, True, True),
    ("admin", "Admin", "Workspace settings, members, integrations, and content.", False, True, True),
    ("editor", "Editor", "Content, media, examples, and publication preparation.", False, False, False),
    ("viewer", "Viewer", "Read-only workspace access.", False, False, False),
]

PLAN_SEED = [
    ("00000000-0000-0000-0000-000000000101", "free", "Free", "Editable free plan for local MVP usage."),
    ("00000000-0000-0000-0000-000000000102", "start", "Start", "Editable starter plan placeholder."),
    ("00000000-0000-0000-0000-000000000103", "pro", "Pro", "Editable professional plan placeholder."),
    ("00000000-0000-0000-0000-000000000104", "business", "Business", "Editable business plan placeholder."),
]

ENTITLEMENT_SEED: dict[str, dict[str, Any]] = {
    "free": {
        "team.seats.max": 1,
        "projects.max": 1,
        "rubrics.active.max": 3,
        "platform_connections.auto.max": 0,
        "ai.text_generations.monthly": 25,
        "ai.transcription_seconds.monthly": 600,
        "storage.bytes.max": 536870912,
        "publications.scheduled.max": 3,
        "feature.instagram_publish": False,
    },
    "start": {
        "team.seats.max": 3,
        "projects.max": 3,
        "rubrics.active.max": 10,
        "platform_connections.auto.max": 1,
        "ai.text_generations.monthly": 250,
        "ai.transcription_seconds.monthly": 7200,
        "storage.bytes.max": 5368709120,
        "publications.scheduled.max": 25,
        "feature.instagram_publish": False,
    },
    "pro": {
        "team.seats.max": 10,
        "projects.max": 15,
        "rubrics.active.max": 50,
        "platform_connections.auto.max": 5,
        "ai.text_generations.monthly": 2000,
        "ai.transcription_seconds.monthly": 36000,
        "storage.bytes.max": 53687091200,
        "publications.scheduled.max": 250,
        "feature.instagram_publish": True,
    },
    "business": {
        "team.seats.max": 30,
        "projects.max": 100,
        "rubrics.active.max": 300,
        "platform_connections.auto.max": 25,
        "ai.text_generations.monthly": 10000,
        "ai.transcription_seconds.monthly": 180000,
        "storage.bytes.max": 536870912000,
        "publications.scheduled.max": 2000,
        "feature.instagram_publish": True,
    },
}


async def ensure_catalog(session: AsyncSession) -> None:
    now = utc_now()
    for key, name, description, billing, members, publish in ROLE_SEED:
        role = await session.get(Role, key)
        if role is None:
            session.add(
                Role(
                    key=key,
                    name=name,
                    description=description,
                    can_manage_billing=billing,
                    can_manage_members=members,
                    can_publish=publish,
                    created_at=now,
                )
            )
        else:
            role.name = name
            role.description = description
            role.can_manage_billing = billing
            role.can_manage_members = members
            role.can_publish = publish

    for plan_id, key, name, description in PLAN_SEED:
        plan = await get_plan_by_key(session, key)
        if plan is None:
            plan = Plan(
                id=UUID(plan_id),
                key=key,
                name=name,
                description=description,
                is_active=True,
                created_at=now,
                updated_at=now,
                version=1,
            )
            session.add(plan)
            await session.flush()
            session.add(
                Price(
                    plan_id=plan.id,
                    provider_key="mock",
                    currency="RUB",
                    amount_minor=0,
                    interval="month",
                    is_active=True,
                    created_at=now,
                )
            )
        else:
            plan.name = name
            plan.description = description
            plan.is_active = True
            plan.updated_at = now

        await session.flush()
        for entitlement_key, value in ENTITLEMENT_SEED[key].items():
            entitlement = await session.scalar(
                select(Entitlement).where(
                    Entitlement.plan_id == plan.id,
                    Entitlement.key == entitlement_key,
                )
            )
            if entitlement is None:
                session.add(
                    Entitlement(
                        plan_id=plan.id,
                        key=entitlement_key,
                        value_json=value,
                        created_at=now,
                        updated_at=now,
                    )
                )
            else:
                entitlement.value_json = value
                entitlement.updated_at = now


async def get_plan_by_key(session: AsyncSession, key: str) -> Plan | None:
    return await session.scalar(select(Plan).where(Plan.key == key))
