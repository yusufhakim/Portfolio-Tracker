export type AssetType = "us_equity" | "us_etf" | "in_mf";
export type RangeKey = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

export interface Holding {
  id: number;
  asset_type: AssetType;
  key: string;
  display_name: string;
  quantity: number;
  avg_cost: number;
  currency: string;
  created_at: string;
}

export interface HoldingWithValue extends Holding {
  price: number | null;
  price_currency: string | null;
  price_as_of: string | null;
  market_value_base: number | null;
  cost_base: number | null;
  gain_base: number | null;
  gain_pct: number | null;
  day_change_base: number | null;
}

export interface Portfolio {
  base_currency: string;
  total_value_base: number;
  total_cost_base: number;
  total_gain_base: number;
  total_gain_pct: number;
  day_change_base: number;
  holdings: HoldingWithValue[];
}

export interface HistoryPoint {
  ts: string;
  value: number;
}

export interface PortfolioHistory {
  base_currency: string;
  range: RangeKey;
  points: HistoryPoint[];
}

export interface SearchItem {
  key: string;
  display_name: string;
  asset_type: AssetType;
  currency: string;
}

export interface HoldingCreate {
  asset_type: AssetType;
  key: string;
  display_name?: string;
  quantity: number;
  avg_cost?: number;
  currency?: string;
}
