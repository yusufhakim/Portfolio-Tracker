// Portfolio valuation + history assembly from on-device transactions & prices.
import {
  fxRateAt,
  getAllPriceLatest,
  getHistorySince,
  latestFxRate,
  listPortfolios,
  listTransactions,
  listTransactionsByPortfolio,
} from "@/db";
import type {
  Asset,
  Holding,
  PortfolioHistoryPoint,
  PortfolioTotals,
  PortfolioWithValue,
  PriceLatest,
  RangeKey,
  Transaction,
} from "@/db/types";

import { FX_PAIR } from "./providers/fx";
import { RANGE_DAYS } from "./providers/types";
import { reduceLots, toUsd } from "./lots";

const EPS = 1e-9;

function dayKey(iso: string): string {
  return iso.slice(0, 10); // yyyy-mm-dd
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export { reduceLots };

/** Distinct assets referenced by a set of transactions. */
function assetsFromTxns(txns: Transaction[]): Asset[] {
  const m = new Map<string, Asset>();
  for (const t of txns) {
    const k = `${t.asset_type}:${t.key}`;
    if (!m.has(k)) {
      m.set(k, { asset_type: t.asset_type, key: t.key, name: t.name, currency: t.currency });
    }
  }
  return [...m.values()];
}

/** Value a set of transactions against the latest prices (single FX snapshot). */
function buildHoldings(
  txns: Transaction[],
  priceMap: Map<string, PriceLatest>,
  usdInr: number | null,
): { holdings: Holding[]; totalValue: number; totalCost: number; totalDay: number } {
  const txByAsset = new Map<string, Transaction[]>();
  for (const t of txns) {
    const k = `${t.asset_type}:${t.key}`;
    const arr = txByAsset.get(k) ?? [];
    arr.push(t);
    txByAsset.set(k, arr);
  }

  const holdings: Holding[] = [];
  let totalValue = 0;
  let totalCost = 0;
  let totalDay = 0;

  for (const a of assetsFromTxns(txns)) {
    const k = `${a.asset_type}:${a.key}`;
    const { qty, costBasis } = reduceLots(txByAsset.get(k) ?? []);
    if (qty <= EPS) continue; // fully sold — not a current holding

    const pl = priceMap.get(k) ?? null;
    const price = pl ? pl.price : null;
    const prev = pl ? pl.prev_close : null;
    const avgCost = qty > 0 ? costBasis / qty : 0;

    const marketValue = price !== null ? qty * price : null;
    const gain = marketValue !== null ? marketValue - costBasis : null;
    const gainPct = gain !== null && costBasis > 0 ? (gain / costBasis) * 100 : null;
    const dayChange = price !== null && prev !== null ? qty * (price - prev) : null;
    const dayChangePct =
      price !== null && prev !== null && prev !== 0 ? ((price - prev) / prev) * 100 : null;

    const mvUsd = marketValue !== null ? toUsd(marketValue, a.currency, usdInr) : null;
    const gainUsd = gain !== null ? toUsd(gain, a.currency, usdInr) : null;
    const dayUsd = dayChange !== null ? toUsd(dayChange, a.currency, usdInr) : null;
    const costUsd = toUsd(costBasis, a.currency, usdInr);

    if (mvUsd !== null) totalValue += mvUsd;
    if (costUsd !== null) totalCost += costUsd;
    if (dayUsd !== null) totalDay += dayUsd;

    holdings.push({
      asset_type: a.asset_type,
      key: a.key,
      name: a.name,
      currency: a.currency,
      qty,
      avg_cost: avgCost,
      price,
      prev_close: prev,
      price_as_of: pl ? pl.as_of : null,
      market_value: marketValue,
      cost_basis: costBasis,
      gain,
      gain_pct: gainPct,
      day_change: dayChange,
      day_change_pct: dayChangePct,
      market_value_usd: mvUsd,
      gain_usd: gainUsd,
      day_change_usd: dayUsd,
    });
  }

  holdings.sort((x, y) => (y.market_value_usd ?? 0) - (x.market_value_usd ?? 0));
  return { holdings, totalValue, totalCost, totalDay };
}

/** Full valuation of one portfolio (holdings + totals, USD). */
export async function getPortfolio(portfolioId: number): Promise<PortfolioTotals> {
  const [txns, latest, usdInr] = await Promise.all([
    listTransactionsByPortfolio(portfolioId),
    getAllPriceLatest(),
    latestFxRate(FX_PAIR),
  ]);
  const priceMap = new Map(latest.map((p) => [`${p.asset_type}:${p.key}`, p]));
  const { holdings, totalValue, totalCost, totalDay } = buildHoldings(txns, priceMap, usdInr);
  const totalGain = totalValue - totalCost;

  return {
    total_value_usd: round2(totalValue),
    total_cost_usd: round2(totalCost),
    total_gain_usd: round2(totalGain),
    total_gain_pct: totalCost > 0 ? round2((totalGain / totalCost) * 100) : 0,
    day_change_usd: round2(totalDay),
    holdings,
  };
}

/** Every portfolio with its current USD value and daily change (for the dashboard). */
export async function listPortfoliosWithValue(): Promise<PortfolioWithValue[]> {
  const [portfolios, txns, latest, usdInr] = await Promise.all([
    listPortfolios(),
    listTransactions(),
    getAllPriceLatest(),
    latestFxRate(FX_PAIR),
  ]);
  const priceMap = new Map(latest.map((p) => [`${p.asset_type}:${p.key}`, p]));
  const byPf = new Map<number, Transaction[]>();
  for (const t of txns) {
    const arr = byPf.get(t.portfolio_id) ?? [];
    arr.push(t);
    byPf.set(t.portfolio_id, arr);
  }

  return portfolios.map((p) => {
    const { totalValue, totalDay } = buildHoldings(byPf.get(p.id) ?? [], priceMap, usdInr);
    const prior = totalValue - totalDay;
    const pct = prior > EPS ? (totalDay / prior) * 100 : null;
    return {
      ...p,
      value_usd: round2(totalValue),
      day_change_usd: round2(totalDay),
      day_change_pct: pct === null ? null : round2(pct),
    };
  });
}

/**
 * Portfolio value over time (USD) for one portfolio, reflecting the qty actually
 * held on each day (from transaction dates) × that day's close, converted to USD.
 */
export async function getHistory(
  portfolioId: number, range: RangeKey,
): Promise<PortfolioHistoryPoint[]> {
  const days = RANGE_DAYS[range] ?? 366;
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
  const txns = await listTransactionsByPortfolio(portfolioId);
  const assets = assetsFromTxns(txns);
  if (assets.length === 0) return [];

  interface Series {
    asset: Asset;
    daily: Map<string, number>;
    deltas: { date: string; delta: number }[];
  }
  const series: Series[] = [];
  const allDays = new Set<string>();

  for (const a of assets) {
    const pts = await getHistorySince(a.asset_type, a.key, cutoff);
    const daily = new Map<string, number>();
    for (const p of pts) {
      daily.set(dayKey(p.ts), p.close);
      allDays.add(dayKey(p.ts));
    }
    const deltas = txns
      .filter((t) => t.asset_type === a.asset_type && t.key === a.key)
      .map((t) => ({ date: t.trade_date, delta: t.action === "buy" ? t.qty : -t.qty }))
      .sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
    series.push({ asset: a, daily, deltas });
  }

  if (allDays.size === 0) return [];
  const orderedDays = [...allDays].sort();

  const lastClose = new Map<string, number>();
  const deltaPtr = new Map<string, number>();
  const heldQty = new Map<string, number>();
  for (const s of series) {
    deltaPtr.set(s.asset.key, 0);
    heldQty.set(s.asset.key, 0);
  }

  const out: PortfolioHistoryPoint[] = [];
  for (const day of orderedDays) {
    const dayEndISO = `${day}T23:59:59.999Z`;
    const usdInr = await fxRateAt(FX_PAIR, dayEndISO);
    let total = 0;
    let hasValue = false;
    for (const s of series) {
      const kkey = `${s.asset.asset_type}:${s.asset.key}`;
      let ptr = deltaPtr.get(s.asset.key) ?? 0;
      let qty = heldQty.get(s.asset.key) ?? 0;
      while (ptr < s.deltas.length && s.deltas[ptr].date <= day) {
        qty += s.deltas[ptr].delta;
        ptr += 1;
      }
      deltaPtr.set(s.asset.key, ptr);
      heldQty.set(s.asset.key, qty);

      const c = s.daily.get(day);
      if (c !== undefined) lastClose.set(kkey, c);
      const close = lastClose.get(kkey);

      if (close !== undefined && qty > EPS) {
        const usd = toUsd(qty * close, s.asset.currency, usdInr);
        if (usd !== null) {
          total += usd;
          hasValue = true;
        }
      }
    }
    if (hasValue) out.push({ ts: `${day}T00:00:00.000Z`, value: round2(total) });
  }
  return out;
}
