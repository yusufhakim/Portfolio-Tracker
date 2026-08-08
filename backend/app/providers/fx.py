"""USD/INR FX rate via open.er-api.com (free, keyless).

Endpoint: GET https://open.er-api.com/v6/latest/USD -> { rates: { INR: 83.1, ... } }
The stored ``USDINR`` pair means: 1 USD = <rate> INR.
"""
from __future__ import annotations

from datetime import datetime, timezone

import httpx

URL = "https://open.er-api.com/v6/latest/USD"
PAIR = "USDINR"


class FxProvider:
    async def get_usd_inr(self) -> tuple[float, datetime]:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(URL)
            resp.raise_for_status()
            data = resp.json()
        rate = data.get("rates", {}).get("INR")
        if not rate:
            raise ValueError("USD/INR rate unavailable")
        return float(rate), datetime.now(timezone.utc)
