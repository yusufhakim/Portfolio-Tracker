"""Database models.

Asset addressing:
- US equities / ETFs use a ticker symbol as ``key`` (e.g. "AAPL", "VOO").
- Indian mutual funds use the AMFI scheme code as ``key`` (e.g. "119551").

Every row carries ``user_id`` so multi-user auth can be layered on later; Stage 1
uses a single fixed user id from settings.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Float,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base

# Asset type constants
US_EQUITY = "us_equity"
US_ETF = "us_etf"
IN_MF = "in_mf"
US_ASSET_TYPES = (US_EQUITY, US_ETF)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Holding(Base):
    __tablename__ = "holdings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    asset_type: Mapped[str] = mapped_column(String(16), nullable=False)
    # ticker (US) or AMFI scheme code (IN mutual fund)
    key: Mapped[str] = mapped_column(String(32), nullable=False)
    display_name: Mapped[str] = mapped_column(String(256), default="")
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    avg_cost: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "asset_type", "key", name="uq_holding_user_asset"),
    )


class PriceLatest(Base):
    """Most recent known price/NAV per asset (upserted by the scheduler)."""

    __tablename__ = "price_latest"

    asset_type: Mapped[str] = mapped_column(String(16), primary_key=True)
    key: Mapped[str] = mapped_column(String(32), primary_key=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    # previous close, used for day-change; may be None
    prev_close: Mapped[float | None] = mapped_column(Float, nullable=True)
    as_of: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)


class PriceHistory(Base):
    """Time series of closing prices/NAVs used to build the performance graph."""

    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_type: Mapped[str] = mapped_column(String(16), nullable=False)
    key: Mapped[str] = mapped_column(String(32), nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    close: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)

    __table_args__ = (
        UniqueConstraint("asset_type", "key", "ts", name="uq_price_hist_point"),
        Index("ix_price_hist_lookup", "asset_type", "key", "ts"),
    )


class FxRate(Base):
    """Time series of FX rates (e.g. pair='USDINR' -> 1 USD in INR)."""

    __tablename__ = "fx_rates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pair: Mapped[str] = mapped_column(String(8), nullable=False)
    rate: Mapped[float] = mapped_column(Float, nullable=False)
    as_of: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    __table_args__ = (
        UniqueConstraint("pair", "as_of", name="uq_fx_point"),
        Index("ix_fx_lookup", "pair", "as_of"),
    )


class PortfolioSnapshot(Base):
    """Daily total-value snapshot, anchoring long-range history accurately."""

    __tablename__ = "portfolio_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    total_value_base: Mapped[float] = mapped_column(Float, nullable=False)
    base_currency: Mapped[str] = mapped_column(String(8), nullable=False)
    breakdown_json: Mapped[str] = mapped_column(String, default="{}")

    __table_args__ = (
        UniqueConstraint("user_id", "ts", name="uq_snapshot_point"),
    )
