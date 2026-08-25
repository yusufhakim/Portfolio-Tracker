// US equities & ETFs via Yahoo Finance's public endpoints (free, keyless,
// unofficial). Used as the source for historical candles (Finnhub's free candle
// endpoint is no longer usable) and as a fallback for quotes/search so tickers
// Finnhub's free tier doesn't cover (e.g. LIT) still work.
import type { AssetType, RangeKey } from "@/db/types";

import type { CandlePoint, Quote, SearchResult } from "./types";

const BASE = "https://query1.finance.yahoo.com";
const CURRENCY = "USD";

// Yahoo chart range + interval per app range. Longer ranges use coarser intervals.
const RANGE_MAP: Record<RangeKey, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "5D": { range: "5d", interval: "1d" },
  "1M": { range: "1mo", interval: "1d" },
  "6M": { range: "6mo", interval: "1d" },
  YTD: { range: "ytd", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
  "5Y": { range: "5y", interval: "1wk" },
  MAX: { range: "max", interval: "1mo" },
};

function sym(symbol: string): string {
  return encodeURIComponent(symbol);
}

async function fetchChart(symbol: string, range: string, interval: string): Promise<any> {
  const res = await fetch(
    `${BASE}/v8/finance/chart/${sym(symbol)}?range=${range}&interval=${interval}`,
  );
  if (!res.ok) throw new Error(`Yahoo chart ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error("Yahoo chart: empty result");
  return result;
}

export async function getCandles(symbol: string, range: RangeKey): Promise<CandlePoint[]> {
  const { range: r, interval } = RANGE_MAP[range] ?? RANGE_MAP["1Y"];
  const result = await fetchChart(symbol, r, interval);
  const ts: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const out: CandlePoint[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (c !== null && Number.isFinite(c)) {
      out.push({ ts: new Date(ts[i] * 1000).toISOString(), close: Number(c) });
    }
  }
  return out;
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  const result = await fetchChart(symbol, "1d", "1d");
  const meta = result.meta ?? {};
  const price = Number(meta.regularMarketPrice);
  if (!Number.isFinite(price)) return null;
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? null;
  const asOf = meta.regularMarketTime
    ? new Date(meta.regularMarketTime * 1000).toISOString()
    : new Date().toISOString();
  return {
    key: symbol,
    price,
    currency: meta.currency ?? CURRENCY,
    prev_close: prev !== null && Number.isFinite(Number(prev)) ? Number(prev) : null,
    as_of: asOf,
  };
}

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const results = await Promise.allSettled(symbols.map((s) => getQuote(s)));
  const out: Quote[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) out.push(r.value);
  }
  return out;
}

export async function search(query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `${BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0`,
  );
  if (!res.ok) throw new Error(`Yahoo search ${res.status}`);
  const data = await res.json();
  const out: SearchResult[] = [];
  for (const q of data?.quotes ?? []) {
    const symbol: string = q.symbol ?? "";
    const type = String(q.quoteType ?? "").toUpperCase();
    if (!symbol || symbol.includes(".")) continue; // skip foreign-exchange listings
    if (type !== "EQUITY" && type !== "ETF") continue;
    out.push({
      key: symbol,
      name: q.shortname || q.longname || symbol,
      asset_type: (type === "ETF" ? "us_etf" : "us_equity") as AssetType,
      currency: CURRENCY,
    });
  }
  return out;
}
