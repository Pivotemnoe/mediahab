from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes.admin import router as admin_router
from app.api.v1.routes.ai import router as ai_router
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.billing import router as billing_router
from app.api.v1.routes.content import router as content_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.me import router as me_router
from app.api.v1.routes.projects import router as projects_router
from app.api.v1.routes.workspaces import router as workspaces_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(me_router, tags=["me"])
api_router.include_router(workspaces_router, tags=["workspaces"])
api_router.include_router(projects_router, tags=["projects"])
api_router.include_router(content_router, tags=["content"])
api_router.include_router(ai_router, tags=["ai"])
api_router.include_router(billing_router, tags=["billing"])
api_router.include_router(admin_router, tags=["admin"])
api_router.include_router(health_router, prefix="/health", tags=["health"])
