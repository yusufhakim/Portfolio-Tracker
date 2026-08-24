// Market indices via Yahoo Finance's public chart endpoint (free, keyless,
// unofficial). Used only for the dashboard's USA / India index cards — the data
// is ephemeral and never stored in SQLite.
export type Market = "us" | "in";

export interface IndexQuote {
  symbol: string;
  name: string;
  level: number; // latest index level
  changePct: number | null; // % change vs. previous close
  sparkline: number[]; // intraday closes (nulls dropped)
}

interface IndexDef {
  symbol: string; // Yahoo symbol, e.g. "^GSPC"
  name: string; // display name
}

const INDICES: Record<Market, IndexDef[]> = {
  us: [
    { symbol: "^GSPC", name: "S&P 500" },
    { symbol: "^IXIC", name: "Nasdaq" },
    { symbol: "^DJI", name: "Dow Jones" },
  ],
  in: [
    { symbol: "^BSESN", name: "Sensex" },
    { symbol: "^NSEI", name: "Nifty 50" },
    { symbol: "^NSMIDCP", name: "Nifty Next 50" },
  ],
};

const BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

async function fetchIndex(def: IndexDef): Promise<IndexQuote> {
  const sym = def.symbol.replace("^", "%5E");
  const res = await fetch(`${BASE}/${sym}?range=1d&interval=5m`);
  if (!res.ok) throw new Error(`Yahoo chart ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error("Yahoo chart: empty result");

  const meta = result.meta ?? {};
  const level = Number(meta.regularMarketPrice);
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
  const changePct =
    prevClose && Number.isFinite(level) && prevClose !== 0
      ? ((level - Number(prevClose)) / Number(prevClose)) * 100
      : null;

  const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const sparkline = rawCloses.filter(
    (c): c is number => c !== null && Number.isFinite(c),
  );

  return {
    symbol: def.symbol,
    name: def.name,
    level: Number.isFinite(level) ? level : NaN,
    changePct,
    sparkline,
  };
}

/**
 * Fetch every index for a market in parallel. Individual failures are tolerated
 * (Yahoo is unofficial) — a failed index is returned with NaN level / null
 * change so the card can show "unavailable" without breaking the row.
 */
export async function getIndices(market: Market): Promise<IndexQuote[]> {
  const defs = INDICES[market];
  const results = await Promise.allSettled(defs.map((d) => fetchIndex(d)));
  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          symbol: defs[i].symbol,
          name: defs[i].name,
          level: NaN,
          changePct: null,
          sparkline: [],
        },
  );
}
