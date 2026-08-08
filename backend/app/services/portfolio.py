"""Portfolio valuation and performance-history assembly (base-currency aware)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Holding, PriceHistory, PriceLatest
from ..providers.base import RANGE_DAYS
from ..schemas import (
    HistoryPoint,
    HoldingWithValue,
    PortfolioHistoryOut,
    PortfolioOut,
)
from . import fx


def _latest_price_map(db: Session) -> dict[tuple[str, str], PriceLatest]:
    rows = db.execute(select(PriceLatest)).scalars().all()
    return {(r.asset_type, r.key): r for r in rows}


def build_portfolio(db: Session, user_id: int) -> PortfolioOut:
    base = settings.base_currency
    usd_inr = fx.latest_usd_inr(db)
    prices = _latest_price_map(db)
    holdings = (
        db.execute(select(Holding).where(Holding.user_id == user_id)).scalars().all()
    )

    items: list[HoldingWithValue] = []
    total_value = total_cost = total_day_change = 0.0

    for h in holdings:
        pl = prices.get((h.asset_type, h.key))
        item = HoldingWithValue.model_validate(h)
        if pl is not None:
            item.price = pl.price
            item.price_currency = pl.currency
            item.price_as_of = pl.as_of

            mv = fx.convert(pl.price * h.quantity, pl.currency, base, usd_inr)
            cost = fx.convert(h.avg_cost * h.quantity, h.currency, base, usd_inr)
            item.market_value_base = mv
            item.cost_base = cost
            if mv is not None and cost is not None:
                item.gain_base = mv - cost
                item.gain_pct = ((mv - cost) / cost * 100) if cost else None
            if pl.prev_close is not None:
                day = fx.convert(
                    (pl.price - pl.prev_close) * h.quantity, pl.currency, base, usd_inr
                )
                item.day_change_base = day
                if day is not None:
                    total_day_change += day
            if mv is not None:
                total_value += mv
            if cost is not None:
                total_cost += cost
        items.append(item)

    total_gain = total_value - total_cost
    return PortfolioOut(
        base_currency=base,
        total_value_base=round(total_value, 2),
        total_cost_base=round(total_cost, 2),
        total_gain_base=round(total_gain, 2),
        total_gain_pct=round((total_gain / total_cost * 100), 2) if total_cost else 0.0,
        day_change_base=round(total_day_change, 2),
        holdings=items,
    )


def _daily_series(points: list[tuple[datetime, float]]) -> dict[str, float]:
    """Collapse a (ts, close) series to one close per calendar day (last wins)."""
    by_day: dict[str, float] = {}
    for ts, close in points:
        by_day[ts.date().isoformat()] = close
    return by_day


def build_history(db: Session, user_id: int, range_key: str) -> PortfolioHistoryOut:
    """Assemble total portfolio value over time from stored price history.

    For each holding we take its daily close series, forward-fill across days,
    convert to base currency and sum across holdings per day. Intraday shape for
    1D relies on whatever finer-grained points the scheduler cached that day.
    """
    base = settings.base_currency
    range_key = range_key.upper()
    days = RANGE_DAYS.get(range_key, 366)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    holdings = (
        db.execute(select(Holding).where(Holding.user_id == user_id)).scalars().all()
    )
    if not holdings:
        return PortfolioHistoryOut(base_currency=base, range=range_key, points=[])

    # For very short ranges, use raw timestamps to keep intraday detail.
    intraday = range_key in ("1D", "1W")

    if intraday:
        return _intraday_history(db, holdings, base, cutoff, range_key)
    return _daily_history(db, holdings, base, cutoff, range_key)


def _fetch_points(
    db: Session, asset_type: str, key: str, cutoff: datetime
) -> list[tuple[datetime, float]]:
    rows = (
        db.execute(
            select(PriceHistory.ts, PriceHistory.close)
            .where(
                PriceHistory.asset_type == asset_type,
                PriceHistory.key == key,
                PriceHistory.ts >= cutoff,
            )
            .order_by(PriceHistory.ts.asc())
        )
        .all()
    )
    return [(ts, close) for ts, close in rows]


def _daily_history(
    db: Session,
    holdings: list[Holding],
    base: str,
    cutoff: datetime,
    range_key: str,
) -> PortfolioHistoryOut:
    # Union of all calendar days across holdings
    per_holding_daily: list[tuple[Holding, dict[str, float]]] = []
    all_days: set[str] = set()
    for h in holdings:
        series = _fetch_points(db, h.asset_type, h.key, cutoff)
        daily = _daily_series(series)
        per_holding_daily.append((h, daily))
        all_days.update(daily.keys())

    if not all_days:
        return PortfolioHistoryOut(base_currency=base, range=range_key, points=[])

    ordered_days = sorted(all_days)
    points: list[HistoryPoint] = []
    # forward-fill last known close per holding
    last_close: dict[int, float] = {}
    for day in ordered_days:
        ts = datetime.fromisoformat(day).replace(tzinfo=timezone.utc)
        usd_inr = fx.usd_inr_at(db, ts)
        total = 0.0
        have_any = False
        for h, daily in per_holding_daily:
            if day in daily:
                last_close[h.id] = daily[day]
            close = last_close.get(h.id)
            if close is None:
                continue
            mv = fx.convert(close * h.quantity, h.currency, base, usd_inr)
            if mv is not None:
                total += mv
                have_any = True
        if have_any:
            points.append(HistoryPoint(ts=ts, value=round(total, 2)))

    return PortfolioHistoryOut(base_currency=base, range=range_key, points=points)


def _intraday_history(
    db: Session,
    holdings: list[Holding],
    base: str,
    cutoff: datetime,
    range_key: str,
) -> PortfolioHistoryOut:
    # Gather all distinct timestamps; forward-fill each holding across them.
    per_holding: list[tuple[Holding, list[tuple[datetime, float]]]] = []
    all_ts: set[datetime] = set()
    for h in holdings:
        series = _fetch_points(db, h.asset_type, h.key, cutoff)
        per_holding.append((h, series))
        all_ts.update(ts for ts, _ in series)

    if not all_ts:
        # fall back to daily assembly if no fine-grained points exist yet
        return _daily_history(db, holdings, base, cutoff, range_key)

    ordered = sorted(all_ts)
    idx: dict[int, int] = {h.id: 0 for h, _ in per_holding}
    last_close: dict[int, float] = {}
    points: list[HistoryPoint] = []
    for ts in ordered:
        usd_inr = fx.usd_inr_at(db, ts)
        total = 0.0
        have_any = False
        for h, series in per_holding:
            i = idx[h.id]
            while i < len(series) and series[i][0] <= ts:
                last_close[h.id] = series[i][1]
                i += 1
            idx[h.id] = i
            close = last_close.get(h.id)
            if close is None:
                continue
            mv = fx.convert(close * h.quantity, h.currency, base, usd_inr)
            if mv is not None:
                total += mv
                have_any = True
        if have_any:
            points.append(HistoryPoint(ts=ts, value=round(total, 2)))

    return PortfolioHistoryOut(base_currency=base, range=range_key, points=points)
