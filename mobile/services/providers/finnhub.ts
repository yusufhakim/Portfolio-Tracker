// US equities & ETFs via Finnhub (free tier). Ported from backend/app/providers/finnhub.py.
import type { AssetType, RangeKey } from "@/db/types";
import { FINNHUB_API_KEY } from "@/services/config";

import type { CandlePoint, Quote, SearchResult } from "./types";

const BASE = "https://finnhub.io/api/v1";
const CURRENCY = "USD";

const RESOLUTION: Record<RangeKey, { resolution: string; days: number }> = {
  "1D": { resolution: "5", days: 1 },
  "5D": { resolution: "30", days: 5 },
  "1M": { resolution: "D", days: 31 },
  "6M": { resolution: "D", days: 184 },
  YTD: { resolution: "D", days: 366 },
  "1Y": { resolution: "D", days: 366 },
  "5Y": { resolution: "W", days: 1830 },
  MAX: { resolution: "M", days: 10950 },
};

function tokenParam(): string {
  return `token=${encodeURIComponent(FINNHUB_API_KEY)}`;
}

export async function getQuote(key: string): Promise<Quote | null> {
  const res = await fetch(`${BASE}/quote?symbol=${encodeURIComponent(key)}&${tokenParam()}`);
  if (!res.ok) throw new Error(`Finnhub quote ${res.status}`);
  const data = await res.json();
  if (!data.c) return null; // 0/undefined = no data
  const ts = data.t ? new Date(data.t * 1000).toISOString() : new Date().toISOString();
  return {
    key,
    price: Number(data.c),
    currency: CURRENCY,
    prev_close: data.pc ? Number(data.pc) : null,
    as_of: ts,
  };
}

export async function getQuotes(keys: string[]): Promise<Quote[]> {
  const results = await Promise.allSettled(keys.map((k) => getQuote(k)));
  const out: Quote[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) out.push(r.value);
  }
  return out;
}

export async function getCandles(key: string, range: RangeKey): Promise<CandlePoint[]> {
  const { resolution, days } = RESOLUTION[range] ?? RESOLUTION["1Y"];
  const now = Math.floor(Date.now() / 1000);
  const from = now - days * 86400;
  const res = await fetch(
    `${BASE}/stock/candle?symbol=${encodeURIComponent(key)}&resolution=${resolution}&from=${from}&to=${now}&${tokenParam()}`,
  );
  if (!res.ok) throw new Error(`Finnhub candle ${res.status}`);
  const data = await res.json();
  if (data.s !== "ok") return [];
  const closes: number[] = data.c ?? [];
  const stamps: number[] = data.t ?? [];
  return stamps.map((t, i) => ({
    ts: new Date(t * 1000).toISOString(),
    close: Number(closes[i]),
  }));
}

export async function search(query: string): Promise<SearchResult[]> {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&${tokenParam()}`);
  if (!res.ok) throw new Error(`Finnhub search ${res.status}`);
  const data = await res.json();
  const out: SearchResult[] = [];
  for (const item of (data.result ?? []).slice(0, 25)) {
    const symbol: string = item.symbol ?? "";
    if (!symbol || symbol.includes(".")) continue; // skip exchange-suffixed symbols
    const itemType = (item.type ?? "").toLowerCase();
    const asset_type: AssetType = itemType.includes("etf") ? "us_etf" : "us_equity";
    out.push({
      key: symbol,
      name: item.description ?? symbol,
      asset_type,
      currency: CURRENCY,
    });
  }
  return out;
}
