// Pure holdings math (no DB/network imports) so it is unit-testable in isolation.
import type { Transaction } from "@/db/types";

const EPS = 1e-9;

/**
 * Average-cost reduction over a chronological transaction list.
 * Returns net qty held and the cost basis of the remaining units (native currency).
 */
export function reduceLots(txns: Transaction[]): { qty: number; costBasis: number } {
  const ordered = [...txns].sort((a, b) =>
    a.trade_date < b.trade_date ? -1 : a.trade_date > b.trade_date ? 1 : a.id - b.id,
  );
  let qty = 0;
  let costBasis = 0;
  for (const t of ordered) {
    if (t.action === "buy") {
      qty += t.qty;
      costBasis += t.qty * t.price;
    } else {
      const avg = qty > EPS ? costBasis / qty : 0;
      const sellQty = Math.min(t.qty, qty);
      qty -= sellQty;
      costBasis -= sellQty * avg;
      if (qty < EPS) {
        qty = 0;
        costBasis = 0;
      }
    }
  }
  return { qty, costBasis };
}

/** Convert a native-currency amount to USD using a USD/INR rate. */
export function toUsd(
  amount: number, currency: string, usdInr: number | null,
): number | null {
  if (currency === "USD") return amount;
  if (currency === "INR") return usdInr && usdInr !== 0 ? amount / usdInr : null;
  return null;
}
