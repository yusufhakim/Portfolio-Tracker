// Import buy/sell transactions from an Excel (.xlsx/.xls) or CSV file.
//
// Expected columns (header row, case-insensitive; order doesn't matter):
//   Portfolio — name of the portfolio to add to (blank → default portfolio)
//   Market    — "US" or "India"   (US stocks/ETFs vs Indian mutual funds)
//   Symbol    — ticker (US, e.g. AAPL) or AMFI scheme code (India, e.g. 119551)
//   Action    — "Buy"/"Purchase" or "Sell"/"Sale"
//   Quantity  — number (decimals allowed)
//   Price     — number, in the asset's own currency
//   Date      — dd/mm/yyyy (also accepts a real Excel date cell)
// (A "Name" column is optional and ignored if present.)
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { StorageAccessFramework as SAF } from "expo-file-system/legacy";
import * as XLSX from "xlsx";

import {
  getSetting,
  listPortfolios,
  listTransactions,
  setSetting,
} from "@/db";
import type { AssetType, TransactionInput, TxAction } from "@/db/types";
import { runTrusted } from "@/services/lockControl";
import { displayToIso, isoToDisplay } from "@/theme";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const SAVE_DIR_KEY = "import_save_dir_uri";

/** A parsed row before its portfolio name is resolved to an id. */
export type ParsedRow = Omit<TransactionInput, "portfolio_id"> & {
  portfolioName: string | null;
};

/** Columns in the import template (Portfolio first; blank → default portfolio). */
export const TEMPLATE_COLUMNS = [
  "Portfolio", "Market", "Symbol", "Action", "Quantity", "Price", "Date",
];

/** Columns in the full transactions export. */
export const EXPORT_COLUMNS = [
  "Transaction Date",
  "Portfolio",
  "Buy / Sale",
  "Market",
  "Ticker Symbol",
  "Company Name",
  "Quantity",
  "Price",
];

function marketLabel(assetType: AssetType): string {
  return assetType === "in_mf" ? "India" : "USA";
}

/** Save an xlsx (base64), prompting the user to pick a folder every time. */
async function saveXlsxAsk(base64: string, fileName: string): Promise<string> {
  return runTrusted(async () => {
    const perm = await SAF.requestDirectoryPermissionsAsync();
    if (!perm.granted || !perm.directoryUri) {
      throw new Error("No folder was chosen.");
    }
    await writeXlsxTo(perm.directoryUri, base64, fileName);
    return prettyDirName(perm.directoryUri);
  });
}

/**
 * Export every transaction to an .xlsx. Prompts for a folder each time and saves
 * as "Transactions_dd_mm_yyyy.xlsx". Returns { folder, fileName, count }.
 */
export async function exportTransactions(): Promise<{
  folder: string;
  fileName: string;
  count: number;
}> {
  const [txns, portfolios] = await Promise.all([listTransactions(), listPortfolios()]);
  const pfName = new Map(portfolios.map((p) => [p.id, p.name]));

  const rows: (string | number)[][] = [EXPORT_COLUMNS];
  for (const t of txns) {
    rows.push([
      isoToDisplay(t.trade_date),
      pfName.get(t.portfolio_id) ?? "",
      t.action === "buy" ? "Buy" : "Sale",
      marketLabel(t.asset_type),
      t.key,
      t.name,
      t.qty,
      t.price,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" }) as string;

  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const fileName = `Transactions_${dd}_${mm}_${d.getFullYear()}`;
  const folder = await saveXlsxAsk(base64, fileName);
  return { folder, fileName: `${fileName}.xlsx`, count: txns.length };
}

/**
 * Save a folder the user picked (once) for template downloads and remember it so
 * later downloads don't prompt again. Returns a usable SAF directory URI.
 */
async function ensureSaveDir(): Promise<string> {
  const stored = await getSetting(SAVE_DIR_KEY);
  if (stored) return stored;
  const perm = await SAF.requestDirectoryPermissionsAsync();
  if (!perm.granted || !perm.directoryUri) {
    throw new Error("No folder was chosen. Pick a folder (e.g. Download) to save the template.");
  }
  await setSetting(SAVE_DIR_KEY, perm.directoryUri);
  return perm.directoryUri;
}

async function writeXlsxTo(dirUri: string, base64: string, fileName: string): Promise<string> {
  const fileUri = await SAF.createFileAsync(dirUri, fileName, XLSX_MIME);
  await SAF.writeAsStringAsync(fileUri, base64, { encoding: "base64" });
  return fileUri;
}

/** Save an xlsx (base64) into the remembered folder, re-prompting once if stale. */
async function saveXlsxToFolder(base64: string, fileName: string): Promise<string> {
  return runTrusted(async () => {
    let dirUri = await ensureSaveDir();
    try {
      await writeXlsxTo(dirUri, base64, fileName);
    } catch {
      await setSetting(SAVE_DIR_KEY, "");
      dirUri = await ensureSaveDir();
      await writeXlsxTo(dirUri, base64, fileName);
    }
    return prettyDirName(dirUri);
  });
}

/**
 * Build a ready-to-fill .xlsx template (headers + one example row) and save it
 * straight into a folder on the phone (the user picks the folder — e.g. Download
 * — the first time only; after that it saves there silently). Returns the folder
 * name for a confirmation message.
 */
export async function downloadTemplate(): Promise<string> {
  const rows: (string | number)[][] = [
    TEMPLATE_COLUMNS,
    ["USA", "US", "AAPL", "Buy", 10, 150, "05/02/2026"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" }) as string;
  return saveXlsxToFolder(base64, "portfolio-import-template");
}

/** Best-effort human-readable name of the chosen SAF folder (e.g. "Download"). */
function prettyDirName(dirUri: string): string {
  try {
    const decoded = decodeURIComponent(dirUri);
    const seg = decoded.split(/[/:]/).filter(Boolean).pop() ?? "";
    return seg || "your chosen folder";
  } catch {
    return "your chosen folder";
  }
}

export interface ImportResult {
  toInsert: ParsedRow[];
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
  const picked = await runTrusted(() =>
    DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
        "text/comma-separated-values",
        "application/octet-stream",
        "*/*",
      ],
    }),
  );
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

  const toInsert: ParsedRow[] = [];
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
    const portfolioRaw = field(row, ["portfolio", "bucket", "account"]);

    const symbol = String(symbolRaw ?? "").trim();
    const portfolioName = String(portfolioRaw ?? "").trim() || null;

    if (!market) { errors.push(`Row ${line}: missing/invalid Market (use "US" or "India")`); return; }
    if (!symbol) { errors.push(`Row ${line}: missing Symbol`); return; }
    if (!action) { errors.push(`Row ${line}: Action must be Buy or Sell`); return; }
    if (qty === null || qty <= 0) { errors.push(`Row ${line}: Quantity must be a number > 0`); return; }
    if (price === null || price < 0) { errors.push(`Row ${line}: Price must be a number`); return; }
    if (!dateIso) { errors.push(`Row ${line}: Date must be dd/mm/yyyy`); return; }

    toInsert.push({
      portfolioName,
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
