from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import CheckoutSession, Entitlement, Plan, Price, Subscription, utc_now
from app.db.session import get_session
from app.modules.auth.dependencies import (
    Actor,
    get_current_actor,
    require_csrf,
    require_role,
    require_workspace_membership,
)
from app.modules.billing.catalog import ensure_catalog, get_plan_by_key
from app.modules.billing.service import get_workspace_subscription, usage_totals
from app.modules.shared.errors import api_error

router = APIRouter()


class PriceOut(BaseModel):
    provider_key: str
    currency: str
    amount_minor: int
    interval: str
    is_active: bool


class PlanOut(BaseModel):
    id: UUID
    key: str
    name: str
    description: str
    is_active: bool
    prices: list[PriceOut]
    entitlements: dict[str, object]


class PlansResponse(BaseModel):
    plans: list[PlanOut]


class SubscriptionResponse(BaseModel):
    workspace_id: UUID
    plan_key: str
    plan_name: str
    status: str
    provider_key: str
    current_period_end: str | None
    payment_captured: bool = False


class UsageResponse(BaseModel):
    workspace_id: UUID
    usage: dict[str, float]
    entitlements: dict[str, object]


class CheckoutRequest(BaseModel):
    plan_key: str = Field(min_length=1, max_length=80)


class CheckoutResponse(BaseModel):
    checkout_id: UUID
    workspace_id: UUID
    plan_key: str
    provider_key: str
    status: str
    payment_captured: bool
    message: str


class MessageResponse(BaseModel):
    status: str
    message: str


async def plan_out(db: AsyncSession, plan: Plan) -> PlanOut:
    prices = await db.scalars(select(Price).where(Price.plan_id == plan.id))
    entitlements = await db.scalars(select(Entitlement).where(Entitlement.plan_id == plan.id))
    return PlanOut(
        id=plan.id,
        key=plan.key,
        name=plan.name,
        description=plan.description,
        is_active=plan.is_active,
        prices=[
            PriceOut(
                provider_key=price.provider_key,
                currency=price.currency,
                amount_minor=price.amount_minor,
                interval=price.interval,
                is_active=price.is_active,
            )
            for price in prices
        ],
        entitlements={item.key: item.value_json for item in entitlements},
    )


async def subscription_out(db: AsyncSession, subscription: Subscription) -> SubscriptionResponse:
    plan = await db.get(Plan, subscription.plan_id)
    if plan is None:
        raise RuntimeError("subscription references missing plan")
    return SubscriptionResponse(
        workspace_id=subscription.workspace_id,
        plan_key=plan.key,
        plan_name=plan.name,
        status=subscription.status,
        provider_key=subscription.provider_key,
        current_period_end=subscription.current_period_end.isoformat()
        if subscription.current_period_end
        else None,
        payment_captured=False,
    )


@router.get("/plans", response_model=PlansResponse)
async def list_plans(db: AsyncSession = Depends(get_session)) -> PlansResponse:
    await ensure_catalog(db)
    await db.commit()
    plans = await db.scalars(select(Plan).where(Plan.is_active.is_(True)).order_by(Plan.key))
    return PlansResponse(plans=[await plan_out(db, plan) for plan in plans])


@router.get("/workspaces/{workspace_id}/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    workspace_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> SubscriptionResponse:
    await require_workspace_membership(workspace_id, request, actor, db)
    subscription = await get_workspace_subscription(db, workspace_id)
    if subscription is None:
        raise api_error(404, "subscription_not_found", "Subscription not found.", request=request)
    subscription_model, _ = subscription
    return await subscription_out(db, subscription_model)


@router.get("/workspaces/{workspace_id}/usage", response_model=UsageResponse)
async def get_usage(
    workspace_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> UsageResponse:
    await require_workspace_membership(workspace_id, request, actor, db)
    subscription = await get_workspace_subscription(db, workspace_id)
    if subscription is None:
        entitlements = {}
    else:
        _, plan = subscription
        rows = await db.scalars(select(Entitlement).where(Entitlement.plan_id == plan.id))
        entitlements = {item.key: item.value_json for item in rows}
    return UsageResponse(
        workspace_id=workspace_id,
        usage=await usage_totals(db, workspace_id),
        entitlements=entitlements,
    )


@router.post("/workspaces/{workspace_id}/checkout", response_model=CheckoutResponse)
async def checkout(
    workspace_id: UUID,
    payload: CheckoutRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> CheckoutResponse:
    await ensure_catalog(db)
    _, membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(membership, {"owner"}, request)
    plan = await get_plan_by_key(db, payload.plan_key)
    if plan is None or not plan.is_active:
        raise api_error(404, "plan_not_found", "Plan not found.", request=request)
    checkout_session = CheckoutSession(
        workspace_id=workspace_id,
        plan_id=plan.id,
        provider_key="mock",
        status="pending_manual_contact",
        payment_captured=False,
        metadata_json={"mock": True, "phase": "02"},
        created_at=utc_now(),
    )
    db.add(checkout_session)
    await db.commit()
    return CheckoutResponse(
        checkout_id=checkout_session.id,
        workspace_id=workspace_id,
        plan_key=plan.key,
        provider_key="mock",
        status=checkout_session.status,
        payment_captured=False,
        message="Mock checkout created. No payment was captured.",
    )


@router.post("/workspaces/{workspace_id}/subscription/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    workspace_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> SubscriptionResponse:
    _, membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(membership, {"owner"}, request)
    subscription = await get_workspace_subscription(db, workspace_id)
    if subscription is None:
        raise api_error(404, "subscription_not_found", "Subscription not found.", request=request)
    subscription_model, _ = subscription
    subscription_model.status = "cancel_pending"
    subscription_model.cancel_at = utc_now()
    subscription_model.updated_at = utc_now()
    subscription_model.version += 1
    await db.commit()
    return await subscription_out(db, subscription_model)


@router.get("/billing/payments", response_model=dict[str, list[object]])
async def payments(_: Actor = Depends(get_current_actor)) -> dict[str, list[object]]:
    return {"payments": []}


@router.get("/billing/invoices", response_model=dict[str, list[object]])
async def invoices(_: Actor = Depends(get_current_actor)) -> dict[str, list[object]]:
    return {"invoices": []}
