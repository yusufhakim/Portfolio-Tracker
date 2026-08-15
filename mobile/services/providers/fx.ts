// USD/INR FX via open.er-api.com (free, keyless). Ported from fx.py.
const URL = "https://open.er-api.com/v6/latest/USD";
export const FX_PAIR = "USDINR";

export async function getUsdInr(): Promise<{ rate: number; asOf: string }> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`FX ${res.status}`);
  const data = await res.json();
  const rate = data?.rates?.INR;
  if (!rate) throw new Error("USD/INR unavailable");
  return { rate: Number(rate), asOf: new Date().toISOString() };
}
