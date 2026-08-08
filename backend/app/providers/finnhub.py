"""US equities & ETFs via Finnhub (free tier).

Docs: https://finnhub.io/docs/api
- Quote:   GET /quote?symbol=AAPL           -> c (current), pc (prev close)
- Candles: GET /stock/candle?symbol=&resolution=&from=&to=
- Search:  GET /search?q=

Free tier is ~60 req/min with real-time US quotes; a personal holding count
refreshed every 15 minutes stays far under that.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import httpx

from ..config import settings
from ..models import US_EQUITY, US_ETF
from .base import CandlePoint, Quote, SearchResult

BASE_URL = "https://finnhub.io/api/v1"
CURRENCY = "USD"

# Resolution per range keeps point counts reasonable.
_RESOLUTION = {
    "1D": ("5", 1),
    "1W": ("30", 7),
    "1M": ("D", 31),
    "3M": ("D", 93),
    "1Y": ("D", 366),
    "ALL": ("W", 3650),
}


class FinnhubProvider:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key if api_key is not None else settings.finnhub_api_key

    def _params(self, **kw: object) -> dict[str, object]:
        return {**kw, "token": self.api_key}

    async def get_quotes(self, keys: list[str]) -> list[Quote]:
        if not keys:
            return []
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=15) as client:
            results = await asyncio.gather(
                *(self._quote_one(client, k) for k in keys),
                return_exceptions=True,
            )
        return [q for q in results if isinstance(q, Quote)]

    async def _quote_one(self, client: httpx.AsyncClient, key: str) -> Quote:
        resp = await client.get("/quote", params=self._params(symbol=key))
        resp.raise_for_status()
        data = resp.json()
        price = data.get("c")
        if not price:  # 0 or None means no data for the symbol
            raise ValueError(f"no quote for {key}")
        ts = data.get("t")
        as_of = (
            datetime.fromtimestamp(ts, tz=timezone.utc)
            if ts
            else datetime.now(timezone.utc)
        )
        return Quote(
            key=key,
            price=float(price),
            currency=CURRENCY,
            prev_close=float(data["pc"]) if data.get("pc") else None,
            as_of=as_of,
        )

    async def get_candles(self, key: str, range_key: str) -> list[CandlePoint]:
        resolution, days = _RESOLUTION.get(range_key, ("D", 366))
        now = datetime.now(timezone.utc)
        start = now - timedelta(days=days)
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=20) as client:
            resp = await client.get(
                "/stock/candle",
                params=self._params(
                    symbol=key,
                    resolution=resolution,
                    **{"from": int(start.timestamp()), "to": int(now.timestamp())},
                ),
            )
            resp.raise_for_status()
            data = resp.json()
        if data.get("s") != "ok":
            return []
        closes = data.get("c", [])
        stamps = data.get("t", [])
        return [
            CandlePoint(ts=datetime.fromtimestamp(t, tz=timezone.utc), close=float(c))
            for t, c in zip(stamps, closes)
        ]

    async def search(self, query: str) -> list[SearchResult]:
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=15) as client:
            resp = await client.get("/search", params=self._params(q=query))
            resp.raise_for_status()
            data = resp.json()
        out: list[SearchResult] = []
        for item in data.get("result", [])[:20]:
            symbol = item.get("symbol", "")
            # Skip symbols with exchange suffixes / non common formats for simplicity.
            if not symbol or "." in symbol:
                continue
            item_type = (item.get("type") or "").lower()
            asset_type = US_ETF if "etf" in item_type else US_EQUITY
            out.append(
                SearchResult(
                    key=symbol,
                    display_name=item.get("description", symbol),
                    asset_type=asset_type,
                    currency=CURRENCY,
                )
            )
        return out
