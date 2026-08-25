// Dispatch price-provider calls by asset type.
import type { AssetType, RangeKey } from "@/db/types";
import { US_ASSET_TYPES } from "@/db/types";

import * as finnhub from "./finnhub";
import * as indiaMf from "./indiaMf";
import * as yahoo from "./yahoo";
import type { CandlePoint, Quote, SearchResult } from "./types";

function isUs(assetType: AssetType): boolean {
  return US_ASSET_TYPES.includes(assetType);
}

/**
 * US quotes: Finnhub first, then Yahoo for any symbols Finnhub's free tier
 * doesn't return (e.g. LIT), so nothing silently goes unpriced.
 */
export async function getQuotes(assetType: AssetType, keys: string[]): Promise<Quote[]> {
  if (keys.length === 0) return [];
  if (!isUs(assetType)) return indiaMf.getQuotes(keys);

  let fh: Quote[] = [];
  try {
    fh = await finnhub.getQuotes(keys);
  } catch {
    fh = [];
  }
  const got = new Set(fh.map((q) => q.key));
  const missing = keys.filter((k) => !got.has(k));
  if (missing.length === 0) return fh;

  let yq: Quote[] = [];
  try {
    yq = await yahoo.getQuotes(missing);
  } catch {
    yq = [];
  }
  return [...fh, ...yq];
}

/** US historical candles come from Yahoo (Finnhub's free candles are unavailable). */
export async function getCandles(
  assetType: AssetType, key: string, range: RangeKey,
): Promise<CandlePoint[]> {
  if (!isUs(assetType)) return indiaMf.getCandles(key, range);
  try {
    const c = await yahoo.getCandles(key, range);
    if (c.length > 0) return c;
  } catch {
    /* fall through to Finnhub */
  }
  try {
    return await finnhub.getCandles(key, range);
  } catch {
    return [];
  }
}

/**
 * Search a market. "in_mf" uses mfapi.in. "us" merges Finnhub (symbol+name) with
 * Yahoo results so ETFs/tickers missing from Finnhub's free tier still appear.
 */
export async function search(market: "us" | "in_mf", query: string): Promise<SearchResult[]> {
  if (market === "in_mf") return indiaMf.search(query);

  const [fhRes, yhRes] = await Promise.allSettled([finnhub.search(query), yahoo.search(query)]);
  const fh = fhRes.status === "fulfilled" ? fhRes.value : [];
  const yh = yhRes.status === "fulfilled" ? yhRes.value : [];

  const seen = new Set<string>();
  const merged: SearchResult[] = [];
  for (const r of [...fh, ...yh]) {
    const k = `${r.asset_type}:${r.key}`;
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(r);
  }
  return merged;
}

export type { CandlePoint, Quote, SearchResult };
