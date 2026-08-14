from __future__ import annotations

from worker_app.celery_app import celery_app


@celery_app.task(name="health.ping")
def ping() -> dict[str, str]:
    return {"status": "ok", "service": "worker"}
