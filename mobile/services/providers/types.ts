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
  "5D": 5,
  "1M": 31,
  "6M": 184,
  YTD: 366,
  "1Y": 366,
  "5Y": 1830,
  MAX: 10950,
};
