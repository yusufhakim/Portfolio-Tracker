// Offline unit test for the pure holdings math.
// Run: node --experimental-strip-types services/__tests__/lots.test.ts
import type { Transaction } from "@/db/types";

import { reduceLots, toUsd } from "../lots.ts";

let failures = 0;
function approx(actual: number, expected: number, label: string, tol = 1e-6): void {
  if (Math.abs(actual - expected) > tol) {
    console.log(`FAIL ${label}: got ${actual}, expected ${expected}`);
    failures += 1;
  } else {
    console.log(`ok   ${label} = ${actual}`);
  }
}

function tx(
  id: number, action: "buy" | "sell", qty: number, price: number, date: string,
): Transaction {
  return {
    id, action, qty, price, trade_date: date,
    asset_type: "us_equity", key: "AAPL", name: "Apple", currency: "USD",
    created_at: "",
  };
}

// 1) Buys only — weighted average cost
{
  const r = reduceLots([tx(1, "buy", 10, 150, "2026-01-01"), tx(2, "buy", 5, 160, "2026-02-01")]);
  approx(r.qty, 15, "buys.qty");
  approx(r.costBasis, 2300, "buys.costBasis");
  approx(r.costBasis / r.qty, 153.3333333, "buys.avgCost", 1e-4);
}

// 2) Buy, buy, partial sell — remaining basis at average cost
{
  const r = reduceLots([
    tx(1, "buy", 10, 100, "2026-01-01"),
    tx(2, "buy", 10, 200, "2026-01-05"),
    tx(3, "sell", 5, 250, "2026-03-01"),
  ]);
  approx(r.qty, 15, "partialSell.qty");
  approx(r.costBasis, 2250, "partialSell.costBasis"); // 3000 - 5*150
}

// 3) Out-of-order dates are sorted before reducing
{
  const r = reduceLots([
    tx(2, "sell", 5, 250, "2026-03-01"),
    tx(1, "buy", 10, 100, "2026-01-01"),
  ]);
  approx(r.qty, 5, "ordering.qty");
  approx(r.costBasis, 500, "ordering.costBasis"); // 1000 - 5*100
}

// 4) Oversell clamps to zero
{
  const r = reduceLots([tx(1, "buy", 3, 100, "2026-01-01"), tx(2, "sell", 10, 120, "2026-02-01")]);
  approx(r.qty, 0, "oversell.qty");
  approx(r.costBasis, 0, "oversell.costBasis");
}

// 5) FX conversion
approx(toUsd(100, "USD", 80) ?? -1, 100, "fx.usdPassthrough");
approx(toUsd(8000, "INR", 80) ?? -1, 100, "fx.inrToUsd");
if (toUsd(100, "INR", null) !== null) {
  console.log("FAIL fx.missingRate should be null");
  failures += 1;
} else {
  console.log("ok   fx.missingRate = null");
}

if (failures > 0) {
  console.log(`\n${failures} FAILURE(S)`);
  throw new Error(`${failures} test failure(s)`);
}
console.log("\nALL LOTS TESTS PASSED");
