// Portfolio valuation + history assembly from on-device transactions & prices.
import {
  getAllPriceLatest,
  getPortfolioById,
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

import { getCandles } from "./providers";
import { FX_PAIR } from "./providers/fx";
import type { CandlePoint } from "./providers/types";
import { reduceLots, toUsd } from "./lots";

const EPS = 1e-9;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export { reduceLots };

/** Normalize a portfolio's currency override to a supported display currency. */
export function resolveCurrency(currency: string | null | undefined): string {
  const c = (currency ?? "").toUpperCase();
  return c === "INR" || c === "AED" ? c : "USD";
}

/**
 * Factor to convert a USD amount into `currency`, using the latest stored FX
 * rate. USD → 1. If the rate is missing we fall back to USD (factor 1) so a
 * display never breaks; the effective currency is returned alongside.
 */
async function displayFactor(
  currency: string | null | undefined,
): Promise<{ currency: string; factor: number }> {
  const target = resolveCurrency(currency);
  if (target === "USD") return { currency: "USD", factor: 1 };
  const rate = await latestFxRate(`USD${target}`);
  if (rate === null || !Number.isFinite(rate) || rate <= 0) {
    return { currency: "USD", factor: 1 }; // no rate yet — show USD rather than break
  }
  return { currency: target, factor: rate };
}

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

  const pf = await getPortfolioById(portfolioId);
  const { currency: displayCurrency, factor } = await displayFactor(pf?.currency ?? null);

  return {
    total_value_usd: round2(totalValue),
    total_cost_usd: round2(totalCost),
    total_gain_usd: round2(totalGain),
    total_gain_pct: totalCost > 0 ? round2((totalGain / totalCost) * 100) : 0,
    day_change_usd: round2(totalDay),
    holdings,
    display_currency: displayCurrency,
    fx_factor: factor,
    total_value_display: round2(totalValue * factor),
    total_gain_display: round2(totalGain * factor),
    day_change_display: round2(totalDay * factor),
  };
}

/** Every portfolio with its current USD value and daily change (for the dashboard). */
export async function listPortfoliosWithValue(): Promise<PortfolioWithValue[]> {
  const [portfolios, txns, latest, usdInr, usdInrRate, usdAedRate] = await Promise.all([
    listPortfolios(),
    listTransactions(),
    getAllPriceLatest(),
    latestFxRate(FX_PAIR),
    latestFxRate("USDINR"),
    latestFxRate("USDAED"),
  ]);
  const priceMap = new Map(latest.map((p) => [`${p.asset_type}:${p.key}`, p]));
  const byPf = new Map<number, Transaction[]>();
  for (const t of txns) {
    const arr = byPf.get(t.portfolio_id) ?? [];
    arr.push(t);
    byPf.set(t.portfolio_id, arr);
  }

  const factorFor = (currency: string | null): { currency: string; factor: number } => {
    const target = resolveCurrency(currency);
    if (target === "USD") return { currency: "USD", factor: 1 };
    const rate = target === "INR" ? usdInrRate : usdAedRate;
    if (rate === null || !Number.isFinite(rate) || rate <= 0) return { currency: "USD", factor: 1 };
    return { currency: target, factor: rate };
  };

  return portfolios.map((p) => {
    const { totalValue, totalDay } = buildHoldings(byPf.get(p.id) ?? [], priceMap, usdInr);
    const prior = totalValue - totalDay;
    const pct = prior > EPS ? (totalDay / prior) * 100 : null;
    const { currency: displayCurrency, factor } = factorFor(p.currency);
    return {
      ...p,
      value_usd: round2(totalValue),
      day_change_usd: round2(totalDay),
      day_change_pct: pct === null ? null : round2(pct),
      display_currency: displayCurrency,
      value_display: round2(totalValue * factor),
    };
  });
}

/**
 * Portfolio value over time (USD) for one portfolio and range. Candles are
 * fetched live per range (Yahoo for US, mfapi for India), so long ranges show a
 * real curve back to when holdings were first bought and 1D shows an intraday
 * curve. At each point: qty held as-of that date × that period's close, summed
 * and converted to USD (latest FX). The chart applies the display-currency factor.
 */
export async function getHistory(
  portfolioId: number, range: RangeKey,
): Promise<PortfolioHistoryPoint[]> {
  const txns = await listTransactionsByPortfolio(portfolioId);
  const assets = assetsFromTxns(txns);
  if (assets.length === 0) return [];

  const usdInr = await latestFxRate(FX_PAIR);
  const intraday = range === "1D";
  const bucketKey = (ts: string) => (intraday ? ts : ts.slice(0, 10));

  interface Series {
    asset: Asset;
    closeByKey: Map<string, number>;
    deltas: { date: string; delta: number }[];
  }

  const bucketTs = new Map<string, string>(); // bucket key -> representative ISO ts

  const candleLists = await Promise.all(
    assets.map(async (a) => {
      try {
        return { a, candles: await getCandles(a.asset_type, a.key, range) };
      } catch {
        return { a, candles: [] as CandlePoint[] };
      }
    }),
  );

  const series: Series[] = [];
  for (const { a, candles } of candleLists) {
    const closeByKey = new Map<string, number>();
    for (const c of candles) {
      const k = bucketKey(c.ts);
      closeByKey.set(k, c.close); // candles are ascending → last within a bucket wins
      const rep = bucketTs.get(k);
      if (!rep || c.ts > rep) bucketTs.set(k, c.ts);
    }
    const deltas = txns
      .filter((t) => t.asset_type === a.asset_type && t.key === a.key)
      .map((t) => ({ date: t.trade_date, delta: t.action === "buy" ? t.qty : -t.qty }))
      .sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
    series.push({ asset: a, closeByKey, deltas });
  }

  const keys = [...bucketTs.keys()].sort();
  if (keys.length === 0) return [];

  const lastClose = new Map<string, number>();
  const ptr = new Map<string, number>();
  const heldQty = new Map<string, number>();
  for (const s of series) {
    const akey = `${s.asset.asset_type}:${s.asset.key}`;
    ptr.set(akey, 0);
    heldQty.set(akey, 0);
  }

  const out: PortfolioHistoryPoint[] = [];
  for (const k of keys) {
    const day = k.slice(0, 10);
    let total = 0;
    let hasValue = false;
    for (const s of series) {
      const akey = `${s.asset.asset_type}:${s.asset.key}`;
      let p = ptr.get(akey) ?? 0;
      let qty = heldQty.get(akey) ?? 0;
      while (p < s.deltas.length && s.deltas[p].date <= day) {
        qty += s.deltas[p].delta;
        p += 1;
      }
      ptr.set(akey, p);
      heldQty.set(akey, qty);

      const c = s.closeByKey.get(k);
      if (c !== undefined) lastClose.set(akey, c);
      const close = lastClose.get(akey);
      if (close !== undefined && qty > EPS) {
        const usd = toUsd(qty * close, s.asset.currency, usdInr);
        if (usd !== null) {
          total += usd;
          hasValue = true;
        }
      }
    }
    if (hasValue) out.push({ ts: bucketTs.get(k)!, value: round2(total) });
  }
  return out;
}
