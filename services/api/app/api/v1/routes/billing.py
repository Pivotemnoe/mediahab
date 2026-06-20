from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.base import Entitlement, Invoice, Membership, Payment, Plan, Price, Subscription, utc_now
from app.db.session import get_session
from app.modules.auth.dependencies import (
    Actor,
    get_current_actor,
    require_csrf,
    require_role,
    require_workspace_membership,
)
from app.modules.billing.catalog import ensure_catalog, get_plan_by_key
from app.modules.billing.service import (
    create_checkout_session,
    get_workspace_subscription,
    process_payment_webhook,
    record_audit,
    record_subscription_event,
    usage_snapshot,
)
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
    limits: list[dict[str, object]]


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


class PaymentOut(BaseModel):
    id: UUID
    workspace_id: UUID
    provider_key: str
    provider_payment_id: str | None
    status: str
    amount_minor: int
    currency: str
    payment_captured: bool
    created_at: str


class PaymentsResponse(BaseModel):
    payments: list[PaymentOut]


class InvoiceOut(BaseModel):
    id: UUID
    workspace_id: UUID
    provider_key: str
    provider_invoice_id: str | None
    status: str
    amount_due_minor: int
    amount_paid_minor: int
    currency: str
    invoice_url: str | None
    created_at: str


class InvoicesResponse(BaseModel):
    invoices: list[InvoiceOut]


class PaymentWebhookRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    event_id: str = Field(min_length=1, max_length=160)
    event_type: str = Field(alias="type", min_length=1, max_length=120)
    workspace_id: UUID
    checkout_id: UUID | None = None
    plan_key: str = Field(min_length=1, max_length=80)
    provider_customer_id: str | None = Field(default=None, max_length=160)
    provider_subscription_id: str | None = Field(default=None, max_length=160)
    provider_payment_id: str | None = Field(default=None, max_length=160)
    provider_invoice_id: str | None = Field(default=None, max_length=160)
    amount_minor: int = Field(default=0, ge=0)
    currency: str = Field(default="RUB", min_length=3, max_length=3)


class PaymentWebhookResponse(BaseModel):
    provider_key: str
    event_id: str
    status: str
    processed: bool
    message: str
    subscription: SubscriptionResponse | None = None


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
    snapshot = await usage_snapshot(db, workspace_id)
    return UsageResponse(
        workspace_id=workspace_id,
        usage=snapshot["usage"],
        entitlements=snapshot["entitlements"],
        limits=snapshot["limits"],
    )


@router.post("/workspaces/{workspace_id}/checkout", response_model=CheckoutResponse)
async def checkout(
    workspace_id: UUID,
    payload: CheckoutRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_session),
) -> CheckoutResponse:
    await ensure_catalog(db)
    workspace, membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(membership, {"owner"}, request)
    plan = await get_plan_by_key(db, payload.plan_key)
    if plan is None or not plan.is_active:
        raise api_error(404, "plan_not_found", "Plan not found.", request=request)
    try:
        checkout_session, provider_result = await create_checkout_session(
            db,
            workspace=workspace,
            plan=plan,
            actor_user_id=actor.user.id,
            settings=settings,
        )
    except ValueError as exc:
        raise api_error(422, "payment_provider_not_supported", "Payment provider is not supported.", request=request) from exc
    await db.commit()
    return CheckoutResponse(
        checkout_id=checkout_session.id,
        workspace_id=workspace_id,
        plan_key=plan.key,
        provider_key=provider_result.provider_key,
        status=checkout_session.status,
        payment_captured=provider_result.payment_captured,
        message=provider_result.message,
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
    await record_subscription_event(
        db,
        workspace_id=workspace_id,
        subscription_id=subscription_model.id,
        provider_key=subscription_model.provider_key,
        event_type="subscription.cancel_requested",
        payload={"source": "owner_request", "payment_captured": False},
    )
    await record_audit(
        db,
        workspace_id=workspace_id,
        actor_user_id=actor.user.id,
        action="billing.subscription_cancel_requested",
        resource_type="subscription",
        resource_id=str(subscription_model.id),
        metadata={"provider_key": subscription_model.provider_key},
    )
    await db.commit()
    return await subscription_out(db, subscription_model)


@router.get("/billing/payments", response_model=PaymentsResponse)
async def payments(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> PaymentsResponse:
    workspace_ids = select(Membership.workspace_id).where(Membership.user_id == actor.user.id)
    rows = await db.scalars(
        select(Payment).where(Payment.workspace_id.in_(workspace_ids)).order_by(Payment.created_at.desc())
    )
    return PaymentsResponse(
        payments=[
            PaymentOut(
                id=row.id,
                workspace_id=row.workspace_id,
                provider_key=row.provider_key,
                provider_payment_id=row.provider_payment_id,
                status=row.status,
                amount_minor=row.amount_minor,
                currency=row.currency,
                payment_captured=row.payment_captured,
                created_at=row.created_at.isoformat(),
            )
            for row in rows
        ]
    )


@router.get("/billing/invoices", response_model=InvoicesResponse)
async def invoices(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> InvoicesResponse:
    workspace_ids = select(Membership.workspace_id).where(Membership.user_id == actor.user.id)
    rows = await db.scalars(
        select(Invoice).where(Invoice.workspace_id.in_(workspace_ids)).order_by(Invoice.created_at.desc())
    )
    return InvoicesResponse(
        invoices=[
            InvoiceOut(
                id=row.id,
                workspace_id=row.workspace_id,
                provider_key=row.provider_key,
                provider_invoice_id=row.provider_invoice_id,
                status=row.status,
                amount_due_minor=row.amount_due_minor,
                amount_paid_minor=row.amount_paid_minor,
                currency=row.currency,
                invoice_url=row.invoice_url,
                created_at=row.created_at.isoformat(),
            )
            for row in rows
        ]
    )


@router.post("/webhooks/payments/{provider_key}", response_model=PaymentWebhookResponse)
async def payment_webhook(
    provider_key: str,
    payload: PaymentWebhookRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_session),
) -> PaymentWebhookResponse:
    await ensure_catalog(db)
    result = await process_payment_webhook(
        db,
        provider_key=provider_key,
        payload=payload.model_dump(by_alias=True, mode="json"),
        headers={key.lower(): value for key, value in request.headers.items()},
        settings=settings,
    )
    await db.commit()
    return PaymentWebhookResponse(
        provider_key=result.provider_key,
        event_id=result.event_id,
        status=result.status,
        processed=result.processed,
        message=result.message,
        subscription=await subscription_out(db, result.subscription) if result.subscription is not None else None,
    )
