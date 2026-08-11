import os
from celery import Celery

# Read Redis connection broker URL from environment variables, defaulting to local Redis database 0
REDIS_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
REDIS_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery_app = Celery(
    "photography_crm_tasks",
    broker=REDIS_BROKER_URL,
    backend=REDIS_RESULT_BACKEND,
    include=["tasks"]
)

# Optional configuration settings
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1 # Fetch one image at a time to optimize memory/CPU load
)
