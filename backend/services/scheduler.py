import asyncio
import logging

logger = logging.getLogger(__name__)

async def _decay_loop():
    while True:
        await asyncio.sleep(3600)
        try:
            from backend.database import AsyncSessionLocal
            from backend.services.risk_engine import recalculate_risk_decay
            async with AsyncSessionLocal() as db:
                await recalculate_risk_decay(db)
                await db.commit()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")

async def start_scheduler():
    asyncio.create_task(_decay_loop())
    logger.info("Background scheduler started")
