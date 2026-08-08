"""Maps asset types to their concrete provider and exposes shared instances."""
from __future__ import annotations

from ..models import IN_MF, US_ASSET_TYPES
from .base import PriceProvider
from .finnhub import FinnhubProvider
from .fx import FxProvider
from .india_mf import IndiaMutualFundProvider

_finnhub = FinnhubProvider()
_india = IndiaMutualFundProvider()
fx_provider = FxProvider()


def provider_for(asset_type: str) -> PriceProvider:
    if asset_type in US_ASSET_TYPES:
        return _finnhub
    if asset_type == IN_MF:
        return _india
    raise ValueError(f"unsupported asset_type: {asset_type}")


def group_keys_by_provider(
    pairs: list[tuple[str, str]],
) -> dict[str, tuple[PriceProvider, list[str]]]:
    """Group (asset_type, key) pairs by their provider for batch quoting.

    Returns a dict keyed by a provider bucket name -> (provider, [keys]).
    US equity and ETF share the Finnhub provider and are quoted together.
    """
    buckets: dict[str, tuple[PriceProvider, list[str]]] = {}
    for asset_type, key in pairs:
        provider = provider_for(asset_type)
        bucket = IN_MF if asset_type == IN_MF else "us"
        if bucket not in buckets:
            buckets[bucket] = (provider, [])
        buckets[bucket][1].append(key)
    return buckets
