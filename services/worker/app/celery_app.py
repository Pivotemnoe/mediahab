from __future__ import annotations

import os

from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "temichev_media_hub",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks.health"],
)

celery_app.conf.update(
    task_default_queue="default",
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Europe/Moscow",
    enable_utc=True,
)
