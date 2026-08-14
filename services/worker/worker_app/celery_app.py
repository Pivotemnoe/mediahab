from __future__ import annotations

import sys
from pathlib import Path

from celery import Celery

API_ROOT = Path(__file__).resolve().parents[2] / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.core.config import get_settings  # noqa: E402

settings = get_settings()

celery_app = Celery(
    "temichev_media_hub",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "worker_app.tasks.health",
        "worker_app.tasks.publications",
    ],
)

celery_app.conf.update(
    accept_content=["json"],
    beat_schedule={
        "publication-outbox-drain": {
            "task": "publications.drain_outbox",
            "schedule": 5.0,
        },
    },
    enable_utc=True,
    result_serializer="json",
    task_acks_late=True,
    task_default_queue="default",
    task_reject_on_worker_lost=True,
    task_serializer="json",
    timezone="Europe/Moscow",
    worker_prefetch_multiplier=1,
)
