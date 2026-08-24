// Offline unit test for dashboard number formatting.
// Run: node --experimental-strip-types services/__tests__/formatting.test.ts
import { formatUsd0, formatPct } from "../../theme.ts";

let failures = 0;
function eq(actual: string, expected: string, label: string): void {
  if (actual !== expected) {
    console.log(`FAIL ${label}: got "${actual}", expected "${expected}"`);
    failures += 1;
  } else {
    console.log(`ok   ${label} = "${actual}"`);
  }
}

// formatUsd0: whole-dollar USD with thousands separators, no decimals.
eq(formatUsd0(117049.37), "$117,049", "usd0.rounds");
eq(formatUsd0(0), "$0", "usd0.zero");
eq(formatUsd0(1234), "$1,234", "usd0.thousands");
eq(formatUsd0(999.5), "$1,000", "usd0.roundsUp");
eq(formatUsd0(null), "—", "usd0.null");
eq(formatUsd0(NaN), "—", "usd0.nan");

// formatPct: signed, exactly 2 decimals.
eq(formatPct(1.2345), "+1.23%", "pct.positive");
eq(formatPct(-0.5), "-0.50%", "pct.negative");
eq(formatPct(0), "+0.00%", "pct.zero");
eq(formatPct(null), "—", "pct.null");

if (failures > 0) {
  console.log(`\n${failures} FAILURE(S)`);
  throw new Error(`${failures} test failure(s)`);
}
console.log("\nALL FORMATTING TESTS PASSED");
