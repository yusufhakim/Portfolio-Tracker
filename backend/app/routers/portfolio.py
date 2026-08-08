"""Portfolio value + performance history endpoints."""
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..providers.base import RANGE_DAYS
from ..schemas import PortfolioHistoryOut, PortfolioOut
from ..services import portfolio as portfolio_service

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("", response_model=PortfolioOut)
def get_portfolio(db: Session = Depends(get_db)) -> PortfolioOut:
    return portfolio_service.build_portfolio(db, settings.default_user_id)


@router.get("/history", response_model=PortfolioHistoryOut)
def get_history(
    range: str = Query("1M", pattern="^(1D|1W|1M|3M|1Y|ALL)$"),
    db: Session = Depends(get_db),
) -> PortfolioHistoryOut:
    return portfolio_service.build_history(db, settings.default_user_id, range)


@router.post("/refresh", status_code=202)
async def refresh_now(background: BackgroundTasks) -> dict[str, str]:
    """Trigger an immediate price/NAV + FX refresh (does not wait for completion)."""
    from ..scheduler import refresh_all

    background.add_task(refresh_all)
    return {"status": "refresh scheduled"}
