"""Pydantic request/response models for the API."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from .models import IN_MF, US_EQUITY, US_ETF

ASSET_TYPES = {US_EQUITY, US_ETF, IN_MF}


class HoldingCreate(BaseModel):
    asset_type: str = Field(..., description="us_equity | us_etf | in_mf")
    key: str = Field(..., description="Ticker (US) or AMFI scheme code (IN MF)")
    display_name: str = ""
    quantity: float = Field(..., gt=0)
    avg_cost: float = Field(0.0, ge=0)
    currency: str | None = Field(None, description="Defaults from asset type")


class HoldingUpdate(BaseModel):
    quantity: float | None = Field(None, gt=0)
    avg_cost: float | None = Field(None, ge=0)
    display_name: str | None = None


class HoldingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_type: str
    key: str
    display_name: str
    quantity: float
    avg_cost: float
    currency: str
    created_at: datetime


class HoldingWithValue(HoldingOut):
    price: float | None = None
    price_currency: str | None = None
    price_as_of: datetime | None = None
    # Values normalized to the portfolio base currency
    market_value_base: float | None = None
    cost_base: float | None = None
    gain_base: float | None = None
    gain_pct: float | None = None
    day_change_base: float | None = None


class PortfolioOut(BaseModel):
    base_currency: str
    total_value_base: float
    total_cost_base: float
    total_gain_base: float
    total_gain_pct: float
    day_change_base: float
    holdings: list[HoldingWithValue]


class HistoryPoint(BaseModel):
    ts: datetime
    value: float


class PortfolioHistoryOut(BaseModel):
    base_currency: str
    range: str
    points: list[HistoryPoint]


class SearchItem(BaseModel):
    key: str
    display_name: str
    asset_type: str
    currency: str
