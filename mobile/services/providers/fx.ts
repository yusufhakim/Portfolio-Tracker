// FX rates via open.er-api.com (free, keyless). USD is the base; we keep the
// full precision the API returns (typically 5–6 significant figures) so INR/AED
// conversions are accurate. (xe.com has no free public API, so this equivalent
// free spot-rate source is used.)
const URL = "https://open.er-api.com/v6/latest/USD";

export const FX_PAIR = "USDINR"; // kept for existing callers
/** Currencies (besides USD) the app can display a portfolio in. */
export const FX_QUOTE_CURRENCIES = ["INR", "AED"] as const;

/** Legacy single-pair helper (USD→INR). */
export async function getUsdInr(): Promise<{ rate: number; asOf: string }> {
  const { rates, asOf } = await getUsdRates();
  const rate = rates.INR;
  if (!rate) throw new Error("USD/INR unavailable");
  return { rate, asOf };
}

/** All USD→X rates we care about (INR, AED), full precision. */
export async function getUsdRates(): Promise<{ rates: Record<string, number>; asOf: string }> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`FX ${res.status}`);
  const data = await res.json();
  const all = data?.rates ?? {};
  const rates: Record<string, number> = {};
  for (const ccy of FX_QUOTE_CURRENCIES) {
    const r = all[ccy];
    if (typeof r === "number" && Number.isFinite(r)) rates[ccy] = r;
  }
  if (Object.keys(rates).length === 0) throw new Error("No FX rates available");
  return { rates, asOf: new Date().toISOString() };
}
