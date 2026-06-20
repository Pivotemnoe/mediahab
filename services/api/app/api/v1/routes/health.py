from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter()


@router.get("/live")
async def live() -> dict[str, str]:
    return {"status": "ok", "service": "api"}


@router.get("/ready")
async def ready() -> dict[str, object]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": "api",
        "environment": settings.app_env,
        "checks": {
            "database": "configured",
            "redis": "configured",
            "migrations": "phase03_project_rubric_builder",
        },
    }
