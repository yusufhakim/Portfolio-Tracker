"""Provider abstraction so the concrete free-API choices stay swappable.

Routers/services depend only on these dataclasses and the ``PriceProvider``
protocol, never on Finnhub/AMFI specifics.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(slots=True)
class Quote:
    key: str
    price: float
    currency: str
    prev_close: float | None = None
    as_of: datetime | None = None


@dataclass(slots=True)
class CandlePoint:
    ts: datetime
    close: float


@dataclass(slots=True)
class SearchResult:
    key: str
    display_name: str
    asset_type: str
    currency: str


# Supported history ranges -> (approx lookback days, point granularity hint)
RANGE_DAYS: dict[str, int] = {
    "1D": 1,
    "1W": 7,
    "1M": 31,
    "3M": 93,
    "1Y": 366,
    "ALL": 3650,
}


class PriceProvider(Protocol):
    async def get_quotes(self, keys: list[str]) -> list[Quote]: ...

    async def get_candles(self, key: str, range_key: str) -> list[CandlePoint]: ...

    async def search(self, query: str) -> list[SearchResult]: ...
