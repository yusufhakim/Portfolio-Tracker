import type { AssetType, RangeKey } from "@/db/types";

export interface Quote {
  key: string;
  price: number;
  currency: string;
  prev_close: number | null;
  as_of: string; // ISO
}

export interface CandlePoint {
  ts: string; // ISO
  close: number;
}

export interface SearchResult {
  key: string;
  name: string;
  asset_type: AssetType;
  currency: string;
}

// Approximate lookback window per range, in days.
export const RANGE_DAYS: Record<RangeKey, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 31,
  "3M": 93,
  "1Y": 366,
  ALL: 3650,
};
