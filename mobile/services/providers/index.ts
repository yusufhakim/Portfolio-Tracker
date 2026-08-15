// Dispatch price-provider calls by asset type.
import type { AssetType, RangeKey } from "@/db/types";
import { US_ASSET_TYPES } from "@/db/types";

import * as finnhub from "./finnhub";
import * as indiaMf from "./indiaMf";
import type { CandlePoint, Quote, SearchResult } from "./types";

function isUs(assetType: AssetType): boolean {
  return US_ASSET_TYPES.includes(assetType);
}

export async function getQuotes(assetType: AssetType, keys: string[]): Promise<Quote[]> {
  if (keys.length === 0) return [];
  return isUs(assetType) ? finnhub.getQuotes(keys) : indiaMf.getQuotes(keys);
}

export async function getCandles(
  assetType: AssetType, key: string, range: RangeKey,
): Promise<CandlePoint[]> {
  return isUs(assetType) ? finnhub.getCandles(key, range) : indiaMf.getCandles(key, range);
}

/** Search a market: "us" uses Finnhub (symbol+name), "in_mf" uses mfapi.in. */
export async function search(market: "us" | "in_mf", query: string): Promise<SearchResult[]> {
  return market === "in_mf" ? indiaMf.search(query) : finnhub.search(query);
}

export type { CandlePoint, Quote, SearchResult };
