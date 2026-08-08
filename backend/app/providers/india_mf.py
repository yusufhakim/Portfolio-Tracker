"""Indian mutual funds via mfapi.in (free, keyless, no rate limit).

Docs: https://www.mfapi.in/
- Latest NAV:  GET /mf/{schemeCode}/latest
- Full NAV:    GET /mf/{schemeCode}          (newest-first history)
- Search:      GET /mf/search?q=

NAVs are published once per business day (see scheduler for cadence rationale).
All values are in INR. Scheme codes are the AMFI codes used as the holding ``key``.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import httpx

from ..models import IN_MF
from .base import CandlePoint, Quote, SearchResult

BASE_URL = "https://api.mfapi.in"
CURRENCY = "INR"

# mfapi.in returns dates as dd-mm-yyyy
_DATE_FMT = "%d-%m-%Y"

# Approximate point cap per range (history is daily).
_RANGE_POINTS = {
    "1D": 2,
    "1W": 6,
    "1M": 23,
    "3M": 66,
    "1Y": 260,
    "ALL": 100000,
}


def _parse_date(raw: str) -> datetime:
    return datetime.strptime(raw, _DATE_FMT).replace(tzinfo=timezone.utc)


class IndiaMutualFundProvider:
    async def get_quotes(self, keys: list[str]) -> list[Quote]:
        if not keys:
            return []
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=20) as client:
            results = await asyncio.gather(
                *(self._quote_one(client, k) for k in keys),
                return_exceptions=True,
            )
        return [q for q in results if isinstance(q, Quote)]

    async def _quote_one(self, client: httpx.AsyncClient, key: str) -> Quote:
        resp = await client.get(f"/mf/{key}/latest")
        resp.raise_for_status()
        data = resp.json()
        points = data.get("data") or []
        if not points:
            raise ValueError(f"no NAV for scheme {key}")
        latest = points[0]
        nav = float(latest["nav"])
        prev = float(points[1]["nav"]) if len(points) > 1 else None
        return Quote(
            key=key,
            price=nav,
            currency=CURRENCY,
            prev_close=prev,
            as_of=_parse_date(latest["date"]),
        )

    async def get_candles(self, key: str, range_key: str) -> list[CandlePoint]:
        limit = _RANGE_POINTS.get(range_key, 260)
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30) as client:
            resp = await client.get(f"/mf/{key}")
            resp.raise_for_status()
            data = resp.json()
        points = data.get("data") or []
        # history is newest-first; take the most recent `limit`, return oldest-first
        recent = points[:limit]
        out = [
            CandlePoint(ts=_parse_date(p["date"]), close=float(p["nav"]))
            for p in recent
        ]
        out.reverse()
        return out

    async def search(self, query: str) -> list[SearchResult]:
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=20) as client:
            resp = await client.get("/mf/search", params={"q": query})
            resp.raise_for_status()
            data = resp.json()
        return [
            SearchResult(
                key=str(item["schemeCode"]),
                display_name=item.get("schemeName", str(item["schemeCode"])),
                asset_type=IN_MF,
                currency=CURRENCY,
            )
            for item in data[:20]
        ]
