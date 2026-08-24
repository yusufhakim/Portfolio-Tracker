// Price/NAV/FX refresh orchestration (on-device replacement for scheduler.py).
import {
  getAllPriceLatest,
  insertFxRate,
  insertHistoryPoint,
  insertHistoryPoints,
  listAssets,
  upsertPriceLatest,
} from "@/db";
import type { Asset, AssetType, RangeKey } from "@/db/types";
import { US_ASSET_TYPES } from "@/db/types";

import { getUsdRates } from "./providers/fx";
import * as providers from "./providers";

/** Refresh USD→INR and USD→AED rates. Silent on failure (keeps last known). */
export async function refreshFx(): Promise<void> {
  try {
    const { rates, asOf } = await getUsdRates();
    for (const [ccy, rate] of Object.entries(rates)) {
      await insertFxRate(`USD${ccy}`, rate, asOf);
    }
  } catch {
    // keep prior rate
  }
}

/**
 * Refresh latest quotes for all tracked assets and append a history point.
 * We always fetch (no market-hours gate): providers return the last known
 * price when markets are closed, which is exactly what we want to display.
 */
export async function refreshQuotes(): Promise<number> {
  const assets = await listAssets();
  if (assets.length === 0) return 0;

  // group keys by asset_type
  const byType = new Map<AssetType, string[]>();
  for (const a of assets) {
    const arr = byType.get(a.asset_type) ?? [];
    arr.push(a.key);
    byType.set(a.asset_type, arr);
  }

  let updated = 0;
  for (const [assetType, keys] of byType) {
    let quotes;
    try {
      quotes = await providers.getQuotes(assetType, keys);
    } catch {
      continue;
    }
    for (const q of quotes) {
      await upsertPriceLatest({
        asset_type: assetType,
        key: q.key,
        price: q.price,
        prev_close: q.prev_close,
        currency: q.currency,
        as_of: q.as_of,
      });
      await insertHistoryPoint(assetType, q.key, q.as_of, q.price);
      updated += 1;
    }
  }
  return updated;
}

/** Backfill daily history for one asset so its chart renders immediately. */
export async function backfillHistory(
  asset: Asset, range: RangeKey = "1Y",
): Promise<void> {
  try {
    const candles = await providers.getCandles(asset.asset_type, asset.key, range);
    await insertHistoryPoints(
      asset.asset_type, asset.key, candles.map((c) => ({ ts: c.ts, close: c.close })),
    );
  } catch {
    // ignore backfill failures
  }
}

/** Full refresh: FX + all quotes. Used on app open, pull-to-refresh, background. */
export async function refreshAll(): Promise<void> {
  await refreshFx();
  await refreshQuotes();
}

/** After adding a new asset: quote it now and backfill 1Y history. */
export async function refreshNewAsset(asset: Asset): Promise<void> {
  try {
    const quotes = await providers.getQuotes(asset.asset_type, [asset.key]);
    for (const q of quotes) {
      await upsertPriceLatest({
        asset_type: asset.asset_type,
        key: q.key,
        price: q.price,
        prev_close: q.prev_close,
        currency: q.currency,
        as_of: q.as_of,
      });
      await insertHistoryPoint(asset.asset_type, asset.key, q.as_of, q.price);
    }
  } catch {
    // ignore
  }
  await backfillHistory(asset, "1Y");
}

/** Ensure every tracked asset has some history (backfill any that are empty). */
export async function ensureHistory(): Promise<void> {
  const assets = await listAssets();
  const latest = await getAllPriceLatest();
  const priced = new Set(latest.map((p) => `${p.asset_type}:${p.key}`));
  for (const a of assets) {
    if (!priced.has(`${a.asset_type}:${a.key}`)) {
      await backfillHistory(a, "1Y");
    }
  }
}

export function isUsAsset(assetType: AssetType): boolean {
  return US_ASSET_TYPES.includes(assetType);
}
