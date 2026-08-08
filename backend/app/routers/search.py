"""Symbol / scheme search across providers."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..models import IN_MF, US_EQUITY, US_ETF
from ..providers.finnhub import FinnhubProvider
from ..providers.india_mf import IndiaMutualFundProvider
from ..schemas import SearchItem

router = APIRouter(prefix="/search", tags=["search"])

_finnhub = FinnhubProvider()
_india = IndiaMutualFundProvider()


@router.get("", response_model=list[SearchItem])
async def search(
    q: str = Query(..., min_length=1),
    type: str = Query("us", pattern="^(us|in_mf)$", description="us | in_mf"),
) -> list[SearchItem]:
    try:
        if type == "in_mf":
            results = await _india.search(q)
        else:
            results = await _finnhub.search(q)
    except Exception as exc:  # provider/network error
        raise HTTPException(502, f"search provider error: {exc}")
    return [
        SearchItem(
            key=r.key,
            display_name=r.display_name,
            asset_type=r.asset_type,
            currency=r.currency,
        )
        for r in results
    ]
