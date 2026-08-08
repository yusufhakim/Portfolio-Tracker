"""APScheduler jobs implementing the update cadence requirements.

Jobs (all timezone-aware):
- US refresh: every 15 min, weekdays, during US market hours (09:30-16:00 ET).
  15 min < the 20-min requirement, with headroom under Finnhub's 60 req/min.
- India MF refresh: daily ~23:30 IST. Indian equity markets close 15:30 IST, but
  SEBI-regulated funds only *publish* the day's NAV by ~23:00 IST, so the earliest
  a genuinely new NAV can be fetched is that evening. If a fund hasn't published
  yet, the prior NAV is kept and the next run retries.
- FX refresh: hourly USD/INR.
- Daily snapshot: 23:45 UTC, records total value for accurate long-range history.

On startup we backfill price history so graphs render immediately.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, time, timezone
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from .config import settings
from .db import SessionLocal
from .models import (
    IN_MF,
    US_ASSET_TYPES,
    FxRate,
    Holding,
    PortfolioSnapshot,
    PriceHistory,
    PriceLatest,
)
from .providers.base import CandlePoint, Quote
from .providers.registry import fx_provider, provider_for
from .services import portfolio as portfolio_service

logger = logging.getLogger("scheduler")

ET = ZoneInfo("America/New_York")
IST = ZoneInfo("Asia/Kolkata")

scheduler = AsyncIOScheduler(timezone="UTC")


# --------------------------------------------------------------------------- #
# Persistence helpers
# --------------------------------------------------------------------------- #
def _upsert_price_latest(db: Session, asset_type: str, q: Quote) -> None:
    stmt = sqlite_insert(PriceLatest).values(
        asset_type=asset_type,
        key=q.key,
        price=q.price,
        currency=q.currency,
        prev_close=q.prev_close,
        as_of=q.as_of or datetime.now(timezone.utc),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["asset_type", "key"],
        set_={
            "price": stmt.excluded.price,
            "currency": stmt.excluded.currency,
            "prev_close": stmt.excluded.prev_close,
            "as_of": stmt.excluded.as_of,
        },
    )
    db.execute(stmt)


def _insert_history_point(
    db: Session, asset_type: str, key: str, ts: datetime, close: float, currency: str
) -> None:
    stmt = (
        sqlite_insert(PriceHistory)
        .values(
            asset_type=asset_type, key=key, ts=ts, close=close, currency=currency
        )
        .on_conflict_do_nothing(index_elements=["asset_type", "key", "ts"])
    )
    db.execute(stmt)


def _distinct_holdings(db: Session) -> list[tuple[str, str, str]]:
    """Distinct (asset_type, key, currency) across all users' holdings."""
    rows = db.execute(
        select(Holding.asset_type, Holding.key, Holding.currency).distinct()
    ).all()
    return [(a, k, c) for a, k, c in rows]


# --------------------------------------------------------------------------- #
# Quote refresh
# --------------------------------------------------------------------------- #
async def _refresh_quotes_for(asset_types: tuple[str, ...]) -> int:
    """Fetch latest quotes for holdings whose asset_type is in ``asset_types``."""
    with SessionLocal() as db:
        targets = [
            (a, k, c) for a, k, c in _distinct_holdings(db) if a in asset_types
        ]
    if not targets:
        return 0

    # Group keys per provider bucket; remember which asset_types share a key.
    # (US equity/ETF share Finnhub and the same ticker.)
    by_bucket: dict[str, tuple[object, dict[str, list[tuple[str, str]]]]] = {}
    for asset_type, key, currency in targets:
        bucket = IN_MF if asset_type == IN_MF else "us"
        provider = provider_for(asset_type)
        entry = by_bucket.setdefault(bucket, (provider, {}))
        entry[1].setdefault(key, []).append((asset_type, currency))

    updated = 0
    for _bucket, (provider, key_map) in by_bucket.items():
        quotes = await provider.get_quotes(list(key_map.keys()))
        if not quotes:
            continue
        with SessionLocal() as db:
            for q in quotes:
                for asset_type, _currency in key_map.get(q.key, []):
                    _upsert_price_latest(db, asset_type, q)
                    _insert_history_point(
                        db,
                        asset_type,
                        q.key,
                        q.as_of or datetime.now(timezone.utc),
                        q.price,
                        q.currency,
                    )
                    updated += 1
            db.commit()
    logger.info("refreshed %d quotes for %s", updated, asset_types)
    return updated


async def refresh_us_quotes() -> int:
    return await _refresh_quotes_for(US_ASSET_TYPES)


async def refresh_india_navs() -> int:
    return await _refresh_quotes_for((IN_MF,))


async def refresh_fx() -> None:
    try:
        rate, ts = await fx_provider.get_usd_inr()
    except Exception as exc:
        logger.warning("FX refresh failed: %s", exc)
        return
    with SessionLocal() as db:
        db.add(FxRate(pair="USDINR", rate=rate, as_of=ts))
        db.commit()
    logger.info("USD/INR = %.4f", rate)


# --------------------------------------------------------------------------- #
# Market-hours guard (skip US refresh when the market is closed)
# --------------------------------------------------------------------------- #
def _us_market_open(now_et: datetime | None = None) -> bool:
    now_et = now_et or datetime.now(ET)
    if now_et.weekday() >= 5:  # Sat/Sun
        return False
    return time(9, 30) <= now_et.time() <= time(16, 0)


async def refresh_us_if_open() -> None:
    if _us_market_open():
        await refresh_us_quotes()
    else:
        logger.debug("US market closed; skipping quote refresh")


# --------------------------------------------------------------------------- #
# History backfill
# --------------------------------------------------------------------------- #
async def backfill_history(range_key: str = "1Y") -> None:
    with SessionLocal() as db:
        targets = _distinct_holdings(db)
    for asset_type, key, currency in targets:
        provider = provider_for(asset_type)
        try:
            candles: list[CandlePoint] = await provider.get_candles(key, range_key)
        except Exception as exc:
            logger.warning("backfill failed for %s %s: %s", asset_type, key, exc)
            continue
        if not candles:
            continue
        with SessionLocal() as db:
            for c in candles:
                _insert_history_point(db, asset_type, key, c.ts, c.close, currency)
            db.commit()
        logger.info("backfilled %d points for %s %s", len(candles), asset_type, key)


# --------------------------------------------------------------------------- #
# Snapshot
# --------------------------------------------------------------------------- #
def write_snapshot() -> None:
    with SessionLocal() as db:
        user_ids = db.execute(select(Holding.user_id).distinct()).scalars().all()
        for user_id in user_ids:
            p = portfolio_service.build_portfolio(db, user_id)
            breakdown = {
                h.key: h.market_value_base
                for h in p.holdings
                if h.market_value_base is not None
            }
            stmt = (
                sqlite_insert(PortfolioSnapshot)
                .values(
                    user_id=user_id,
                    ts=datetime.now(timezone.utc),
                    total_value_base=p.total_value_base,
                    base_currency=p.base_currency,
                    breakdown_json=json.dumps(breakdown),
                )
                .on_conflict_do_nothing(index_elements=["user_id", "ts"])
            )
            db.execute(stmt)
            db.commit()
    logger.info("wrote portfolio snapshot(s)")


# --------------------------------------------------------------------------- #
# Combined manual refresh (used by /portfolio/refresh and on holding add)
# --------------------------------------------------------------------------- #
async def refresh_all() -> None:
    await refresh_fx()
    await refresh_us_quotes()
    await refresh_india_navs()


async def refresh_new_holding(asset_type: str, key: str, currency: str) -> None:
    """Quote + backfill a single newly added holding so the UI populates fast."""
    provider = provider_for(asset_type)
    try:
        quotes = await provider.get_quotes([key])
    except Exception as exc:
        logger.warning("new-holding quote failed for %s %s: %s", asset_type, key, exc)
        quotes = []
    with SessionLocal() as db:
        for q in quotes:
            _upsert_price_latest(db, asset_type, q)
            _insert_history_point(
                db, asset_type, key, q.as_of or datetime.now(timezone.utc),
                q.price, q.currency,
            )
        db.commit()
    try:
        candles = await provider.get_candles(key, "1Y")
    except Exception as exc:
        logger.warning("new-holding backfill failed for %s %s: %s", asset_type, key, exc)
        candles = []
    if candles:
        with SessionLocal() as db:
            for c in candles:
                _insert_history_point(db, asset_type, key, c.ts, c.close, currency)
            db.commit()


async def _startup_tasks() -> None:
    await refresh_fx()
    await backfill_history("1Y")
    await refresh_all()


# --------------------------------------------------------------------------- #
# Wiring
# --------------------------------------------------------------------------- #
def start_scheduler() -> None:
    # US quotes: every 15 min, weekdays, ET market window (guarded in the job too).
    scheduler.add_job(
        refresh_us_if_open,
        CronTrigger(day_of_week="mon-fri", hour="9-16", minute="*/15", timezone=ET),
        id="us_quotes",
        replace_existing=True,
        max_instances=1,
    )
    # India MF NAVs: daily 23:30 IST (after publication).
    scheduler.add_job(
        refresh_india_navs,
        CronTrigger(hour=23, minute=30, timezone=IST),
        id="india_navs",
        replace_existing=True,
        max_instances=1,
    )
    # FX: hourly.
    scheduler.add_job(
        refresh_fx,
        CronTrigger(minute=0, timezone=timezone.utc),
        id="fx",
        replace_existing=True,
        max_instances=1,
    )
    # Daily snapshot: 23:45 UTC.
    scheduler.add_job(
        write_snapshot,
        CronTrigger(hour=23, minute=45, timezone=timezone.utc),
        id="snapshot",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    # Kick off startup backfill/refresh without blocking app startup.
    asyncio.create_task(_startup_tasks())
    logger.info("scheduler started")
