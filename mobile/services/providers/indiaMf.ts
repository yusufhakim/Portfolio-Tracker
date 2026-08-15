// Indian mutual funds via mfapi.in (free, keyless). Ported from india_mf.py.
import type { RangeKey } from "@/db/types";

import type { CandlePoint, Quote, SearchResult } from "./types";

const BASE = "https://api.mfapi.in";
const CURRENCY = "INR";

const RANGE_POINTS: Record<RangeKey, number> = {
  "1D": 2,
  "1W": 6,
  "1M": 23,
  "3M": 66,
  "1Y": 260,
  ALL: 100000,
};

// mfapi.in dates are dd-mm-yyyy
function parseDate(raw: string): string {
  const [d, m, y] = raw.split("-");
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).toISOString();
}

export async function getQuote(key: string): Promise<Quote | null> {
  const res = await fetch(`${BASE}/mf/${encodeURIComponent(key)}/latest`);
  if (!res.ok) throw new Error(`mfapi latest ${res.status}`);
  const data = await res.json();
  const points: { date: string; nav: string }[] = data.data ?? [];
  if (points.length === 0) return null;
  const latest = points[0];
  return {
    key,
    price: Number(latest.nav),
    currency: CURRENCY,
    prev_close: points.length > 1 ? Number(points[1].nav) : null,
    as_of: parseDate(latest.date),
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
  const limit = RANGE_POINTS[range] ?? 260;
  const res = await fetch(`${BASE}/mf/${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error(`mfapi history ${res.status}`);
  const data = await res.json();
  const points: { date: string; nav: string }[] = data.data ?? [];
  const recent = points.slice(0, limit).map((p) => ({
    ts: parseDate(p.date),
    close: Number(p.nav),
  }));
  recent.reverse(); // oldest-first
  return recent;
}

export async function search(query: string): Promise<SearchResult[]> {
  const res = await fetch(`${BASE}/mf/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`mfapi search ${res.status}`);
  const data = await res.json();
  return (data as { schemeCode: number; schemeName: string }[])
    .slice(0, 25)
    .map((item) => ({
      key: String(item.schemeCode),
      name: item.schemeName ?? String(item.schemeCode),
      asset_type: "in_mf" as const,
      currency: CURRENCY,
    }));
}
