from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.db.base import (
    AuditLog,
    CheckoutSession,
    Entitlement,
    Invoice,
    MediaAsset,
    Membership,
    Payment,
    PaymentCustomer,
    PaymentWebhookInbox,
    Plan,
    Project,
    ProjectDestination,
    Publication,
    Rubric,
    Subscription,
    SubscriptionEvent,
    UsageEvent,
    Workspace,
    utc_now,
)
from app.modules.billing.providers import CheckoutIntent, CheckoutResult, get_payment_provider


LIMIT_DEFINITIONS = [
    ("projects.max", "Проекты", "items", "start"),
    ("rubrics.active.max", "Активные рубрики", "items", "start"),
    ("platform_connections.auto.max", "Автопубликации", "items", "pro"),
    ("ai.text_generations.monthly", "AI-генерации", "events", "start"),
    ("ai.transcription_seconds.monthly", "Расшифровка", "seconds", "start"),
    ("storage.bytes.max", "Хранилище", "bytes", "pro"),
    ("publications.scheduled.max", "Запланированные публикации", "items", "start"),
    ("team.seats.max", "Места команды", "seats", "start"),
]

SENSITIVE_HEADER_NAMES = {
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "x-mock-payment-signature",
}


@dataclass(frozen=True)
class WebhookProcessResult:
    provider_key: str
    event_id: str
    status: str
    processed: bool
    message: str
    subscription: Subscription | None = None


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


async def entitlement_map_for_plan(session: AsyncSession, plan_id: UUID) -> dict[str, Any]:
    rows = await session.scalars(select(Entitlement).where(Entitlement.plan_id == plan_id))
    return {item.key: item.value_json for item in rows}


async def workspace_entitlements(session: AsyncSession, workspace_id: UUID) -> dict[str, Any]:
    subscription = await get_workspace_subscription(session, workspace_id)
    if subscription is None:
        return {}
    _, plan = subscription
    return await entitlement_map_for_plan(session, plan.id)


async def _count_active_projects(session: AsyncSession, workspace_id: UUID) -> int:
    return int(
        await session.scalar(
            select(func.count())
            .select_from(Project)
            .where(
                Project.workspace_id == workspace_id,
                Project.deleted_at.is_(None),
                Project.status == "active",
            )
        )
        or 0
    )


async def _count_active_rubrics(session: AsyncSession, workspace_id: UUID) -> int:
    return int(
        await session.scalar(
            select(func.count())
            .select_from(Rubric)
            .where(Rubric.workspace_id == workspace_id, Rubric.status == "active")
        )
        or 0
    )


async def _count_auto_destinations(session: AsyncSession, workspace_id: UUID) -> int:
    return int(
        await session.scalar(
            select(func.count())
            .select_from(ProjectDestination)
            .where(
                ProjectDestination.workspace_id == workspace_id,
                ProjectDestination.deleted_at.is_(None),
                ProjectDestination.status == "active",
                ProjectDestination.publication_mode != "manual_export",
            )
        )
        or 0
    )


async def _storage_bytes(session: AsyncSession, workspace_id: UUID) -> int:
    return int(
        await session.scalar(
            select(func.coalesce(func.sum(MediaAsset.size_bytes), 0)).where(
                MediaAsset.workspace_id == workspace_id,
                MediaAsset.deleted_at.is_(None),
            )
        )
        or 0
    )


async def _scheduled_publications(session: AsyncSession, workspace_id: UUID) -> int:
    return int(
        await session.scalar(
            select(func.count())
            .select_from(Publication)
            .where(Publication.workspace_id == workspace_id, Publication.status == "scheduled")
        )
        or 0
    )


def _limit_status(used: float, limit: float) -> str:
    if used > limit:
        return "exceeded"
    if limit > 0 and used >= limit * 0.8:
        return "warning"
    return "ok"


async def usage_snapshot(session: AsyncSession, workspace_id: UUID) -> dict[str, Any]:
    usage = await usage_totals(session, workspace_id)
    entitlements = await workspace_entitlements(session, workspace_id)
    measured_usage = {
        "projects.max": float(await _count_active_projects(session, workspace_id)),
        "rubrics.active.max": float(await _count_active_rubrics(session, workspace_id)),
        "platform_connections.auto.max": float(await _count_auto_destinations(session, workspace_id)),
        "ai.text_generations.monthly": usage.get("ai.text_generations.monthly", usage.get("ai.text_generations", 0.0)),
        "ai.transcription_seconds.monthly": usage.get(
            "ai.transcription_seconds.monthly",
            usage.get("ai.transcription_seconds", 0.0),
        ),
        "storage.bytes.max": float(await _storage_bytes(session, workspace_id)),
        "publications.scheduled.max": float(await _scheduled_publications(session, workspace_id)),
        "team.seats.max": float(await current_team_seats(session, workspace_id)),
    }
    limits = []
    for key, label, unit, upgrade_plan_key in LIMIT_DEFINITIONS:
        raw_limit = entitlements.get(key)
        if isinstance(raw_limit, bool) or raw_limit is None:
            continue
        limit = float(raw_limit)
        used = float(measured_usage.get(key, 0.0))
        limits.append(
            {
                "key": key,
                "label": label,
                "used": used,
                "limit": limit,
                "unit": unit,
                "status": _limit_status(used, limit),
                "upgrade_plan_key": upgrade_plan_key,
            }
        )
    return {"usage": usage, "entitlements": entitlements, "limits": limits}


def safe_webhook_headers(headers: dict[str, str]) -> dict[str, str]:
    safe: dict[str, str] = {}
    for key, value in headers.items():
        lower = key.lower()
        if lower in SENSITIVE_HEADER_NAMES:
            safe[lower] = "[redacted]"
        elif lower.startswith("x-") or lower in {"content-type", "user-agent"}:
            safe[lower] = value[:300]
    return safe


async def record_audit(
    session: AsyncSession,
    *,
    workspace_id: UUID | None,
    actor_user_id: UUID | None,
    action: str,
    resource_type: str,
    resource_id: str | None,
    metadata: dict[str, Any] | None = None,
) -> None:
    session.add(
        AuditLog(
            workspace_id=workspace_id,
            actor_user_id=actor_user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_json=metadata or {},
            created_at=utc_now(),
        )
    )


async def ensure_payment_customer(
    session: AsyncSession,
    *,
    workspace: Workspace,
    provider_key: str,
    provider_customer_id: str | None = None,
) -> PaymentCustomer:
    customer = await session.scalar(
        select(PaymentCustomer).where(
            PaymentCustomer.workspace_id == workspace.id,
            PaymentCustomer.provider_key == provider_key,
        )
    )
    now = utc_now()
    if customer is None:
        customer = PaymentCustomer(
            workspace_id=workspace.id,
            provider_key=provider_key,
            provider_customer_id=provider_customer_id or f"mock_cus_{workspace.id.hex[:12]}",
            status="active",
            email=None,
            metadata_json={"mock": provider_key == "mock"},
            created_at=now,
            updated_at=now,
            version=1,
        )
        session.add(customer)
    else:
        if provider_customer_id:
            customer.provider_customer_id = provider_customer_id
        customer.updated_at = now
        customer.version += 1
    await session.flush()
    return customer


async def create_checkout_session(
    session: AsyncSession,
    *,
    workspace: Workspace,
    plan: Plan,
    actor_user_id: UUID,
    settings: Settings,
) -> tuple[CheckoutSession, CheckoutResult]:
    provider_key = settings.payment_provider
    provider = get_payment_provider(provider_key, settings)
    if provider is None:
        raise ValueError("payment_provider_not_supported")
    customer = await ensure_payment_customer(session, workspace=workspace, provider_key=provider_key)
    result = provider.create_checkout(
        CheckoutIntent(
            workspace_id=workspace.id,
            plan_key=plan.key,
            customer_id=customer.provider_customer_id or str(customer.id),
        )
    )
    checkout_session = CheckoutSession(
        workspace_id=workspace.id,
        plan_id=plan.id,
        provider_key=result.provider_key,
        status=result.status,
        payment_captured=result.payment_captured,
        metadata_json={
            "mock": result.provider_key == "mock",
            "phase": "11",
            "provider_session_id": result.provider_session_id,
            "message": result.message,
        },
        created_at=utc_now(),
    )
    session.add(checkout_session)
    await session.flush()
    await record_audit(
        session,
        workspace_id=workspace.id,
        actor_user_id=actor_user_id,
        action="billing.checkout_created",
        resource_type="checkout_session",
        resource_id=str(checkout_session.id),
        metadata={"plan_key": plan.key, "provider_key": result.provider_key, "payment_captured": False},
    )
    return checkout_session, result


async def record_subscription_event(
    session: AsyncSession,
    *,
    workspace_id: UUID,
    subscription_id: UUID | None,
    provider_key: str,
    event_type: str,
    payload: dict[str, Any],
    provider_event_id: str | None = None,
) -> None:
    session.add(
        SubscriptionEvent(
            workspace_id=workspace_id,
            subscription_id=subscription_id,
            provider_key=provider_key,
            provider_event_id=provider_event_id,
            event_type=event_type,
            payload_json=payload,
            processed_at=utc_now(),
            created_at=utc_now(),
        )
    )


async def assign_subscription_plan(
    session: AsyncSession,
    *,
    workspace: Workspace,
    plan: Plan,
    status: str,
    provider_key: str,
    actor_user_id: UUID | None,
    source: str,
    provider_customer_id: str | None = None,
    provider_subscription_id: str | None = None,
    provider_event_id: str | None = None,
    event_type: str = "plan.assigned",
    metadata: dict[str, Any] | None = None,
) -> Subscription:
    now = utc_now()
    current = await get_workspace_subscription(session, workspace.id)
    if current is None:
        subscription = Subscription(
            workspace_id=workspace.id,
            plan_id=plan.id,
            status=status,
            provider_key=provider_key,
            provider_customer_id=provider_customer_id,
            provider_subscription_id=provider_subscription_id,
            current_period_start=now,
            created_at=now,
            updated_at=now,
            version=1,
        )
        session.add(subscription)
        await session.flush()
    else:
        subscription, _ = current
        subscription.plan_id = plan.id
        subscription.status = status
        subscription.provider_key = provider_key
        if provider_customer_id:
            subscription.provider_customer_id = provider_customer_id
        if provider_subscription_id:
            subscription.provider_subscription_id = provider_subscription_id
        subscription.updated_at = now
        subscription.version += 1
        await session.flush()

    event_payload = {
        "source": source,
        "plan_key": plan.key,
        "status": status,
        "provider_key": provider_key,
        "payment_captured": False,
        **(metadata or {}),
    }
    await record_subscription_event(
        session,
        workspace_id=workspace.id,
        subscription_id=subscription.id,
        provider_key=provider_key,
        provider_event_id=provider_event_id,
        event_type=event_type,
        payload=event_payload,
    )
    await record_audit(
        session,
        workspace_id=workspace.id,
        actor_user_id=actor_user_id,
        action="billing.plan_assigned",
        resource_type="subscription",
        resource_id=str(subscription.id),
        metadata=event_payload,
    )
    return subscription


async def process_payment_webhook(
    session: AsyncSession,
    *,
    provider_key: str,
    payload: dict[str, Any],
    headers: dict[str, str],
    settings: Settings,
) -> WebhookProcessResult:
    provider = get_payment_provider(provider_key, settings)
    if provider is None:
        return WebhookProcessResult(
            provider_key=provider_key,
            event_id=str(payload.get("event_id") or ""),
            status="rejected",
            processed=False,
            message="Payment provider is not enabled.",
        )

    event_id = str(payload["event_id"])
    event_type = str(payload["type"])
    workspace_id = UUID(str(payload["workspace_id"]))
    existing = await session.scalar(
        select(PaymentWebhookInbox).where(
            PaymentWebhookInbox.provider_key == provider_key,
            PaymentWebhookInbox.event_id == event_id,
        )
    )
    if existing is not None:
        subscription = None
        if existing.workspace_id is not None:
            current = await get_workspace_subscription(session, existing.workspace_id)
            subscription = current[0] if current is not None else None
        return WebhookProcessResult(
            provider_key=provider_key,
            event_id=event_id,
            status="duplicate",
            processed=False,
            message="Payment webhook event was already processed.",
            subscription=subscription,
        )

    signature_valid = provider.verify_webhook(headers, payload)
    inbox = PaymentWebhookInbox(
        workspace_id=workspace_id,
        provider_key=provider_key,
        event_id=event_id,
        event_type=event_type,
        payload_json=payload,
        headers_json=safe_webhook_headers(headers),
        signature_valid=signature_valid,
        status="received" if signature_valid else "rejected",
        received_at=utc_now(),
        processed_at=None,
        error_message=None,
    )
    session.add(inbox)
    await session.flush()
    if not signature_valid:
        inbox.processed_at = utc_now()
        inbox.error_message = "Invalid mock payment signature."
        return WebhookProcessResult(
            provider_key=provider_key,
            event_id=event_id,
            status="rejected",
            processed=False,
            message="Payment webhook signature is invalid.",
        )

    workspace = await session.get(Workspace, workspace_id)
    if workspace is None or workspace.deleted_at is not None:
        inbox.status = "failed"
        inbox.error_message = "Workspace not found."
        inbox.processed_at = utc_now()
        return WebhookProcessResult(
            provider_key=provider_key,
            event_id=event_id,
            status="failed",
            processed=False,
            message="Workspace not found.",
        )

    plan_key = str(payload.get("plan_key") or "")
    plan = await session.scalar(select(Plan).where(Plan.key == plan_key, Plan.is_active.is_(True)))
    if plan is None:
        inbox.status = "failed"
        inbox.error_message = "Plan not found."
        inbox.processed_at = utc_now()
        return WebhookProcessResult(
            provider_key=provider_key,
            event_id=event_id,
            status="failed",
            processed=False,
            message="Plan not found.",
        )

    if event_type not in {"checkout.completed", "subscription.updated", "mock.subscription_activated"}:
        inbox.status = "ignored"
        inbox.processed_at = utc_now()
        return WebhookProcessResult(
            provider_key=provider_key,
            event_id=event_id,
            status="ignored",
            processed=True,
            message="Payment webhook event type was ignored.",
        )

    provider_customer_id = str(payload.get("provider_customer_id") or f"mock_cus_{workspace.id.hex[:12]}")
    provider_subscription_id = str(payload.get("provider_subscription_id") or f"mock_sub_{workspace.id.hex[:12]}")
    await ensure_payment_customer(
        session,
        workspace=workspace,
        provider_key=provider_key,
        provider_customer_id=provider_customer_id,
    )
    subscription = await assign_subscription_plan(
        session,
        workspace=workspace,
        plan=plan,
        status="active",
        provider_key=provider_key,
        actor_user_id=None,
        source="mock_payment_webhook",
        provider_customer_id=provider_customer_id,
        provider_subscription_id=provider_subscription_id,
        provider_event_id=event_id,
        event_type=event_type,
        metadata={"webhook_id": str(inbox.id), "simulated": True},
    )

    checkout_id = payload.get("checkout_id")
    checkout_uuid = UUID(str(checkout_id)) if checkout_id else None
    if checkout_uuid is not None:
        checkout_session = await session.get(CheckoutSession, checkout_uuid)
        if checkout_session is not None and checkout_session.workspace_id == workspace.id:
            checkout_session.status = "simulated_success"
            checkout_session.payment_captured = False
            checkout_session.metadata_json = {
                **(checkout_session.metadata_json if isinstance(checkout_session.metadata_json, dict) else {}),
                "webhook_event_id": event_id,
                "payment_captured": False,
            }

    provider_payment_id = str(payload.get("provider_payment_id") or f"mock_pay_{event_id}")
    payment = await session.scalar(
        select(Payment).where(
            Payment.provider_key == provider_key,
            Payment.provider_payment_id == provider_payment_id,
        )
    )
    amount_minor = int(payload.get("amount_minor") or 0)
    currency = str(payload.get("currency") or "RUB")
    if payment is None:
        session.add(
            Payment(
                workspace_id=workspace.id,
                subscription_id=subscription.id,
                checkout_session_id=checkout_uuid,
                provider_key=provider_key,
                provider_payment_id=provider_payment_id,
                status="simulated_succeeded",
                amount_minor=amount_minor,
                currency=currency,
                payment_captured=False,
                metadata_json={"webhook_event_id": event_id, "mock": True},
                created_at=utc_now(),
                updated_at=utc_now(),
            )
        )

    provider_invoice_id = str(payload.get("provider_invoice_id") or f"mock_inv_{event_id}")
    invoice = await session.scalar(
        select(Invoice).where(
            Invoice.provider_key == provider_key,
            Invoice.provider_invoice_id == provider_invoice_id,
        )
    )
    if invoice is None:
        session.add(
            Invoice(
                workspace_id=workspace.id,
                subscription_id=subscription.id,
                provider_key=provider_key,
                provider_invoice_id=provider_invoice_id,
                status="mock_issued",
                amount_due_minor=amount_minor,
                amount_paid_minor=0,
                currency=currency,
                invoice_url=None,
                metadata_json={"webhook_event_id": event_id, "payment_captured": False},
                created_at=utc_now(),
                updated_at=utc_now(),
            )
        )

    inbox.status = "processed"
    inbox.processed_at = utc_now()
    await record_audit(
        session,
        workspace_id=workspace.id,
        actor_user_id=None,
        action="billing.payment_webhook_processed",
        resource_type="payment_webhook_inbox",
        resource_id=str(inbox.id),
        metadata={"provider_key": provider_key, "event_id": event_id, "event_type": event_type},
    )
    await session.flush()
    return WebhookProcessResult(
        provider_key=provider_key,
        event_id=event_id,
        status="processed",
        processed=True,
        message="Mock payment webhook processed. No real payment was captured.",
        subscription=subscription,
    )
