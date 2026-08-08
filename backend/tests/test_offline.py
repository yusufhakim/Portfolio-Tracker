"""Offline verification of core logic (no external network).

Seeds prices/FX directly, then exercises CRUD + valuation + history assembly.
Run: python -m tests.test_offline
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_offline.db")
os.environ.setdefault("BASE_CURRENCY", "USD")

# Fresh DB file
if os.path.exists("test_offline.db"):
    os.remove("test_offline.db")

from app.config import settings  # noqa: E402
from app.db import SessionLocal, init_db  # noqa: E402
from app.models import (  # noqa: E402
    IN_MF,
    US_EQUITY,
    FxRate,
    Holding,
    PriceHistory,
    PriceLatest,
)
from app.services import portfolio as portfolio_service  # noqa: E402

init_db()
now = datetime.now(timezone.utc)
uid = settings.default_user_id


def seed() -> None:
    with SessionLocal() as db:
        # Holdings: 10 AAPL @ $150 (USD), 100 units of MF 119551 @ ₹40 (INR)
        db.add_all(
            [
                Holding(user_id=uid, asset_type=US_EQUITY, key="AAPL",
                        display_name="Apple", quantity=10, avg_cost=150, currency="USD"),
                Holding(user_id=uid, asset_type=IN_MF, key="119551",
                        display_name="Test MF", quantity=100, avg_cost=40, currency="INR"),
            ]
        )
        # Latest prices: AAPL $200 (prev 190), MF ₹50 (prev 49)
        db.add_all(
            [
                PriceLatest(asset_type=US_EQUITY, key="AAPL", price=200, currency="USD",
                            prev_close=190, as_of=now),
                PriceLatest(asset_type=IN_MF, key="119551", price=50, currency="INR",
                            prev_close=49, as_of=now),
            ]
        )
        # FX: 1 USD = 80 INR
        db.add(FxRate(pair="USDINR", rate=80.0, as_of=now))
        # History: 3 daily points each
        for d in range(3):
            ts = now - timedelta(days=2 - d)
            db.add(PriceHistory(asset_type=US_EQUITY, key="AAPL",
                                ts=ts, close=180 + d * 10, currency="USD"))
            db.add(PriceHistory(asset_type=IN_MF, key="119551",
                                ts=ts, close=48 + d, currency="INR"))
        db.commit()


def check() -> None:
    with SessionLocal() as db:
        p = portfolio_service.build_portfolio(db, uid)
        # AAPL: 10 * 200 = $2000
        # MF: 100 * 50 = ₹5000 -> /80 = $62.5
        # total = 2062.5
        assert abs(p.total_value_base - 2062.5) < 0.01, p.total_value_base
        # cost: AAPL 10*150=1500 ; MF 100*40=4000 INR ->/80=50 ; total 1550
        assert abs(p.total_cost_base - 1550.0) < 0.01, p.total_cost_base
        # day change: AAPL (200-190)*10=100 ; MF (50-49)*100=100 INR ->/80=1.25 ; =101.25
        assert abs(p.day_change_base - 101.25) < 0.01, p.day_change_base
        print(f"portfolio OK: value={p.total_value_base} cost={p.total_cost_base} "
              f"day={p.day_change_base} gain%={p.total_gain_pct}")

        h = portfolio_service.build_history(db, uid, "1M")
        assert h.points, "history empty"
        # Last day: AAPL 200close*10=2000 ; MF 50close*100=5000/80=62.5 => 2062.5
        last = h.points[-1].value
        assert abs(last - 2062.5) < 0.01, last
        print(f"history OK: {len(h.points)} points, last={last}, "
              f"first={h.points[0].value}")


if __name__ == "__main__":
    seed()
    check()
    os.remove("test_offline.db")
    print("ALL OFFLINE CHECKS PASSED")
