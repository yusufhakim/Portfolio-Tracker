"""FX lookup + currency conversion helpers backed by the fx_rates table."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import FxRate

PAIR = "USDINR"


def latest_usd_inr(db: Session) -> float | None:
    row = db.execute(
        select(FxRate).where(FxRate.pair == PAIR).order_by(FxRate.as_of.desc()).limit(1)
    ).scalar_one_or_none()
    return row.rate if row else None


def usd_inr_at(db: Session, ts: datetime) -> float | None:
    """Rate at-or-before ``ts``; falls back to the earliest known rate."""
    row = db.execute(
        select(FxRate)
        .where(FxRate.pair == PAIR, FxRate.as_of <= ts)
        .order_by(FxRate.as_of.desc())
        .limit(1)
    ).scalar_one_or_none()
    if row:
        return row.rate
    row = db.execute(
        select(FxRate).where(FxRate.pair == PAIR).order_by(FxRate.as_of.asc()).limit(1)
    ).scalar_one_or_none()
    return row.rate if row else None


def convert(amount: float, from_ccy: str, base_ccy: str, usd_inr: float | None) -> float | None:
    """Convert ``amount`` from ``from_ccy`` into ``base_ccy`` using USD/INR.

    Returns None when a needed rate is missing (so callers can surface "unknown"
    rather than a wrong number).
    """
    if from_ccy == base_ccy:
        return amount
    if usd_inr is None or usd_inr == 0:
        return None
    if from_ccy == "USD" and base_ccy == "INR":
        return amount * usd_inr
    if from_ccy == "INR" and base_ccy == "USD":
        return amount / usd_inr
    # Unsupported currency pair
    return None
