// Import buy/sell transactions from an Excel (.xlsx/.xls) or CSV file.
//
// Expected columns (header row, case-insensitive; order doesn't matter):
//   Market   — "US" or "India"   (US stocks/ETFs vs Indian mutual funds)
//   Symbol   — ticker (US, e.g. AAPL) or AMFI scheme code (India, e.g. 119551)
//   Name     — optional display name
//   Action   — "Buy"/"Purchase" or "Sell"/"Sale"
//   Quantity — number (decimals allowed)
//   Price    — number, in the asset's own currency
//   Date     — dd/mm/yyyy (also accepts a real Excel date cell)
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as XLSX from "xlsx";

import type { AssetType, TransactionInput, TxAction } from "@/db/types";
import { displayToIso } from "@/theme";

export interface ImportResult {
  toInsert: TransactionInput[];
  errors: string[];
  totalRows: number;
  canceled?: boolean;
}

function norm(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

/** Pull a value from a row using any of several accepted header names. */
function field(row: Record<string, unknown>, names: string[]): unknown {
  for (const key of Object.keys(row)) {
    if (names.includes(norm(key))) return row[key];
  }
  return undefined;
}

function parseMarket(v: unknown): { asset_type: AssetType; currency: string } | null {
  const s = norm(v);
  if (!s) return null;
  if (["in", "india", "indian", "in_mf", "mf", "mutual fund"].includes(s)) {
    return { asset_type: "in_mf", currency: "INR" };
  }
  if (s === "us_etf" || s === "etf") return { asset_type: "us_etf", currency: "USD" };
  if (["us", "usa", "united states", "us_equity", "stock", "equity"].includes(s)) {
    return { asset_type: "us_equity", currency: "USD" };
  }
  return null;
}

function parseAction(v: unknown): TxAction | null {
  const s = norm(v);
  if (["buy", "purchase", "b", "bought"].includes(s)) return "buy";
  if (["sell", "sale", "s", "sold"].includes(s)) return "sell";
  return null;
}

function parseDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, "0");
    const d = String(v.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "number" && v > 0) {
    // Excel serial date (days since 1899-12-30)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const dt = new Date(ms);
    if (!isNaN(dt.getTime())) {
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    }
  }
  const s = String(v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // already ISO
  return displayToIso(s); // dd/mm/yyyy -> ISO, or null
}

function parseNumber(v: unknown): number | null {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/[,\s]/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Let the user pick a spreadsheet, then parse+validate it into transactions. */
export async function pickAndParseTransactions(): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    type: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "text/comma-separated-values",
      "application/octet-stream",
      "*/*",
    ],
  });
  if (picked.canceled || !picked.assets?.length) {
    return { toInsert: [], errors: [], totalRows: 0, canceled: true };
  }

  const uri = picked.assets[0].uri;
  const b64 = await new File(uri).base64();
  const wb = XLSX.read(b64, { type: "base64", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: "",
  });

  const toInsert: TransactionInput[] = [];
  const errors: string[] = [];

  rows.forEach((row, i) => {
    const line = i + 2; // +1 for header, +1 for 1-based
    // skip fully-empty rows
    if (Object.values(row).every((v) => norm(v) === "")) return;

    const market = parseMarket(field(row, ["market", "type", "asset type", "asset_type"]));
    const symbolRaw = field(row, ["symbol", "ticker", "code", "scheme code", "scheme", "scheme_code"]);
    const action = parseAction(field(row, ["action", "side", "transaction", "buy/sell"]));
    const qty = parseNumber(field(row, ["quantity", "qty", "units", "shares"]));
    const price = parseNumber(field(row, ["price", "rate", "nav", "cost"]));
    const dateIso = parseDate(field(row, ["date", "trade date", "trade_date"]));
    const nameRaw = field(row, ["name", "description", "fund name", "company"]);

    const symbol = String(symbolRaw ?? "").trim();

    if (!market) { errors.push(`Row ${line}: missing/invalid Market (use "US" or "India")`); return; }
    if (!symbol) { errors.push(`Row ${line}: missing Symbol`); return; }
    if (!action) { errors.push(`Row ${line}: Action must be Buy or Sell`); return; }
    if (qty === null || qty <= 0) { errors.push(`Row ${line}: Quantity must be a number > 0`); return; }
    if (price === null || price < 0) { errors.push(`Row ${line}: Price must be a number`); return; }
    if (!dateIso) { errors.push(`Row ${line}: Date must be dd/mm/yyyy`); return; }

    toInsert.push({
      asset_type: market.asset_type,
      key: market.asset_type === "in_mf" ? symbol : symbol.toUpperCase(),
      name: String(nameRaw ?? "").trim() || symbol,
      currency: market.currency,
      action,
      qty,
      price,
      trade_date: dateIso,
    });
  });

  return { toInsert, errors, totalRows: rows.length };
}
