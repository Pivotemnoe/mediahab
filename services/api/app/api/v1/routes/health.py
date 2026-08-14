from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_session

router = APIRouter()
EXPECTED_ALEMBIC_HEAD = "202606200014"


@router.get("/live")
async def live() -> dict[str, str]:
    return {"status": "ok", "service": "api"}


@router.get("/ready", response_model=None)
async def ready(
    db: AsyncSession = Depends(get_session),
) -> dict[str, object] | JSONResponse:
    settings = get_settings()
    checks = {
        "database": "configured",
        "redis": "configured",
        "migrations": EXPECTED_ALEMBIC_HEAD,
    }

    if settings.app_env.strip().lower() == "production":
        try:
            await db.execute(text("SELECT 1"))
            migration = await db.scalar(text("SELECT version_num FROM alembic_version LIMIT 1"))
            checks["database"] = "ok"
            checks["migrations"] = "ok" if migration == EXPECTED_ALEMBIC_HEAD else "outdated"
        except Exception:
            checks["database"] = "unavailable"
            checks["migrations"] = "unknown"

        redis = Redis.from_url(
            settings.redis_url,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        try:
            checks["redis"] = "ok" if await redis.ping() else "unavailable"
        except Exception:
            checks["redis"] = "unavailable"
        finally:
            await redis.aclose()

    payload = {
        "status": "ok",
        "service": "api",
        "environment": settings.app_env,
        "checks": checks,
    }
    if "unavailable" in checks.values() or "outdated" in checks.values() or "unknown" in checks.values():
        payload["status"] = "not_ready"
        return JSONResponse(status_code=503, content=payload)
    return payload
