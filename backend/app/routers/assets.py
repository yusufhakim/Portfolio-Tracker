"""Holdings CRUD."""
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import IN_MF, Holding
from ..schemas import ASSET_TYPES, HoldingCreate, HoldingOut, HoldingUpdate

router = APIRouter(prefix="/holdings", tags=["holdings"])


def default_currency(asset_type: str) -> str:
    return "INR" if asset_type == IN_MF else "USD"


@router.get("", response_model=list[HoldingOut])
def list_holdings(db: Session = Depends(get_db)) -> list[Holding]:
    return list(
        db.execute(
            select(Holding)
            .where(Holding.user_id == settings.default_user_id)
            .order_by(Holding.created_at.asc())
        )
        .scalars()
        .all()
    )


@router.post("", response_model=HoldingOut, status_code=201)
def create_holding(
    payload: HoldingCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> Holding:
    if payload.asset_type not in ASSET_TYPES:
        raise HTTPException(400, f"invalid asset_type: {payload.asset_type}")
    holding = Holding(
        user_id=settings.default_user_id,
        asset_type=payload.asset_type,
        key=payload.key.strip().upper() if payload.asset_type != IN_MF else payload.key.strip(),
        display_name=payload.display_name,
        quantity=payload.quantity,
        avg_cost=payload.avg_cost,
        currency=payload.currency or default_currency(payload.asset_type),
    )
    db.add(holding)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "holding for this asset already exists")
    db.refresh(holding)

    from ..scheduler import refresh_new_holding

    background.add_task(
        refresh_new_holding, holding.asset_type, holding.key, holding.currency
    )
    return holding


@router.patch("/{holding_id}", response_model=HoldingOut)
def update_holding(
    holding_id: int, payload: HoldingUpdate, db: Session = Depends(get_db)
) -> Holding:
    holding = db.get(Holding, holding_id)
    if not holding or holding.user_id != settings.default_user_id:
        raise HTTPException(404, "holding not found")
    if payload.quantity is not None:
        holding.quantity = payload.quantity
    if payload.avg_cost is not None:
        holding.avg_cost = payload.avg_cost
    if payload.display_name is not None:
        holding.display_name = payload.display_name
    db.commit()
    db.refresh(holding)
    return holding


@router.delete("/{holding_id}", status_code=204, response_class=Response)
def delete_holding(holding_id: int, db: Session = Depends(get_db)) -> Response:
    holding = db.get(Holding, holding_id)
    if not holding or holding.user_id != settings.default_user_id:
        raise HTTPException(404, "holding not found")
    db.delete(holding)
    db.commit()
    return Response(status_code=204)
