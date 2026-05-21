"""
worker.py — ARQ worker entrypoint for Cloud Run Jobs / background service.

Run with:
    python worker.py
or via Dockerfile CMD.
"""

import asyncio
import logging

from arq import Worker
from arq.connections import RedisSettings

from config import Settings
from tasks import WorkerSettings
from database import db_lifespan

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


async def main():
    settings = Settings()
    redis    = RedisSettings.from_dsn(settings.REDIS_URL)

    # Patch WorkerSettings with live Redis URL
    WorkerSettings.redis_settings = redis

    log.info("🚀 ARQ worker starting | redis=%s | max_jobs=%s",
             settings.REDIS_URL, WorkerSettings.max_jobs)

    # Boot DB connection (Motor) for the worker process
    async with db_lifespan():
        worker = Worker(
            functions=WorkerSettings.functions,
            redis_settings=redis,
            max_jobs=WorkerSettings.max_jobs,
            job_timeout=WorkerSettings.job_timeout,
            keep_result=WorkerSettings.keep_result,
            retry_jobs=WorkerSettings.retry_jobs,
            max_tries=WorkerSettings.max_tries,
            poll_delay=settings.REDIS_POLL_DELAY,
        )
        await worker.async_run()


if __name__ == "__main__":
    asyncio.run(main())
