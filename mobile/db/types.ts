// Shared domain + row types for the on-device data model.

export type AssetType = "us_equity" | "us_etf" | "in_mf";
export type TxAction = "buy" | "sell";
export type RangeKey = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";

export const US_ASSET_TYPES: AssetType[] = ["us_equity", "us_etf"];

/** A named portfolio ("bucket"); each transaction belongs to exactly one. */
export interface Portfolio {
  id: number;
  name: string;
  created_at: string;
  sort_order: number;
  /** Display currency override: "USD" | "INR" | "AED", or null = Default (USD). */
  currency: string | null;
}

/** A portfolio plus its computed value (in its display currency) and daily change. */
export interface PortfolioWithValue extends Portfolio {
  value_usd: number;
  day_change_usd: number;
  day_change_pct: number | null;
  /** Resolved display currency ("USD" | "INR" | "AED"). */
  display_currency: string;
  /** value_usd converted into display_currency. */
  value_display: number;
}

/** A single buy/sell transaction — the source of truth for holdings. */
export interface Transaction {
  id: number;
  portfolio_id: number;
  asset_type: AssetType;
  key: string; // ticker (US) or AMFI scheme code (India MF)
  name: string;
  currency: string; // "USD" | "INR"
  action: TxAction;
  qty: number; // fractional allowed
  price: number; // in the asset's native currency
  trade_date: string; // ISO yyyy-mm-dd
  created_at: string;
}

export type TransactionInput = Omit<Transaction, "id" | "created_at">;

/** A tracked security (cache of name/currency + what to price). */
export interface Asset {
  asset_type: AssetType;
  key: string;
  name: string;
  currency: string;
}

export interface PriceLatest {
  asset_type: AssetType;
  key: string;
  price: number;
  prev_close: number | null;
  currency: string;
  as_of: string;
}

export interface HistoryPoint {
  ts: string; // ISO timestamp
  close: number;
}

/** Computed holding for one asset (native currency values). */
export interface Holding {
  asset_type: AssetType;
  key: string;
  name: string;
  currency: string;
  qty: number; // net qty held
  avg_cost: number; // average cost of remaining units (native)
  price: number | null; // latest price (native)
  prev_close: number | null;
  price_as_of: string | null;
  market_value: number | null; // native
  cost_basis: number; // native
  gain: number | null; // native, unrealized
  gain_pct: number | null;
  day_change: number | null; // native
  day_change_pct: number | null;
  // USD-normalized values for the portfolio total
  market_value_usd: number | null;
  gain_usd: number | null;
  day_change_usd: number | null;
}

export interface PortfolioTotals {
  total_value_usd: number;
  total_cost_usd: number;
  total_gain_usd: number;
  total_gain_pct: number;
  day_change_usd: number;
  holdings: Holding[];
  /** Resolved display currency ("USD" | "INR" | "AED"). */
  display_currency: string;
  /** Multiply a USD amount by this to get the display currency (USD → 1). */
  fx_factor: number;
  total_value_display: number;
  total_gain_display: number;
  day_change_display: number;
}

export interface PortfolioHistoryPoint {
  ts: string;
  value: number; // USD
}
