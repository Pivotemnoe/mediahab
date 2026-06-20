from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.base import Subscription, Workspace, utc_now
from app.db.session import get_session
from app.modules.billing.catalog import ensure_catalog, get_plan_by_key
from app.modules.shared.errors import api_error

from .billing import SubscriptionResponse, subscription_out

router = APIRouter()


class AssignPlanRequest(BaseModel):
    plan_key: str = Field(min_length=1, max_length=80)
    status: str = Field(default="active", pattern="^(active|trialing|past_due|cancel_pending)$")


def require_admin_token(
    request: Request,
    x_admin_token: str | None,
    settings: Settings,
) -> None:
    if not x_admin_token or x_admin_token != settings.admin_api_token:
        raise api_error(403, "admin_required", "System operator token required.", request=request)


@router.post("/admin/workspaces/{workspace_id}/assign-plan", response_model=SubscriptionResponse)
async def assign_plan(
    workspace_id: UUID,
    payload: AssignPlanRequest,
    request: Request,
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_session),
) -> SubscriptionResponse:
    require_admin_token(request, x_admin_token, settings)
    await ensure_catalog(db)
    workspace = await db.get(Workspace, workspace_id)
    if workspace is None or workspace.deleted_at is not None:
        raise api_error(404, "workspace_not_found", "Workspace not found.", request=request)
    plan = await get_plan_by_key(db, payload.plan_key)
    if plan is None or not plan.is_active:
        raise api_error(404, "plan_not_found", "Plan not found.", request=request)
    from app.modules.billing.service import get_workspace_subscription

    current = await get_workspace_subscription(db, workspace_id)
    if current is None:
        subscription = Subscription(
            workspace_id=workspace_id,
            plan_id=plan.id,
            status=payload.status,
            provider_key="mock",
            current_period_start=utc_now(),
            created_at=utc_now(),
            updated_at=utc_now(),
            version=1,
        )
        db.add(subscription)
    else:
        subscription, _ = current
        subscription.plan_id = plan.id
        subscription.status = payload.status
        subscription.provider_key = "mock"
        subscription.updated_at = utc_now()
        subscription.version += 1
    await db.commit()
    return await subscription_out(db, subscription)
