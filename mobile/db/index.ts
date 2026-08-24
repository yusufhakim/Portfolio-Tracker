// On-device SQLite storage (expo-sqlite async API). All persistence lives here.
import * as SQLite from "expo-sqlite";

import type {
  Asset,
  AssetType,
  HistoryPoint,
  Portfolio,
  PriceLatest,
  Transaction,
  TransactionInput,
} from "./types";

const DB_NAME = "portfolio.db";
let _db: SQLite.SQLiteDatabase | null = null;
let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  // Single-flight: every concurrent caller awaits the SAME open+migrate promise,
  // so no query can run against a half-initialized DB (which surfaced as a native
  // "NativeDatabase.prepareAsync ... NullPointerException" on the first write).
  if (!_dbPromise) {
    _dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      // WAL for concurrent read/write; busy_timeout so a brief lock waits instead of
      // throwing "database is locked" (which was failing saves during a background refresh).
      await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 8000;");
      await migrate(db);
      _db = db; // only publish AFTER migration fully completes
      return db;
    })().catch((e) => {
      _dbPromise = null; // let the next call retry a clean open
      throw e;
    });
  }
  return _dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_type TEXT NOT NULL,
      key TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      currency TEXT NOT NULL,
      action TEXT NOT NULL,
      qty REAL NOT NULL,
      price REAL NOT NULL,
      trade_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_tx_asset ON transactions(asset_type, key);
    CREATE INDEX IF NOT EXISTS ix_tx_date ON transactions(trade_date);

    CREATE TABLE IF NOT EXISTS assets (
      asset_type TEXT NOT NULL,
      key TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      currency TEXT NOT NULL,
      PRIMARY KEY (asset_type, key)
    );

    CREATE TABLE IF NOT EXISTS price_latest (
      asset_type TEXT NOT NULL,
      key TEXT NOT NULL,
      price REAL NOT NULL,
      prev_close REAL,
      currency TEXT NOT NULL,
      as_of TEXT NOT NULL,
      PRIMARY KEY (asset_type, key)
    );

    CREATE TABLE IF NOT EXISTS price_history (
      asset_type TEXT NOT NULL,
      key TEXT NOT NULL,
      ts TEXT NOT NULL,
      close REAL NOT NULL,
      PRIMARY KEY (asset_type, key, ts)
    );
    CREATE INDEX IF NOT EXISTS ix_hist ON price_history(asset_type, key, ts);

    CREATE TABLE IF NOT EXISTS fx_rates (
      pair TEXT NOT NULL,
      rate REAL NOT NULL,
      as_of TEXT NOT NULL,
      PRIMARY KEY (pair, as_of)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  // --- Stage 3 migration: transactions.portfolio_id (buckets) ---
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(transactions)`);
  if (!cols.some((c) => c.name === "portfolio_id")) {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN portfolio_id INTEGER`);
  }
  // Guarantee at least one portfolio exists.
  let def = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM portfolios ORDER BY sort_order ASC, id ASC LIMIT 1`,
  );
  if (!def) {
    const res = await db.runAsync(
      `INSERT INTO portfolios (name, created_at, sort_order) VALUES (?, ?, 0)`,
      "My Portfolio", new Date().toISOString(),
    );
    def = { id: res.lastInsertRowId };
  }
  // Move any pre-Stage-3 (unassigned) transactions into the default portfolio.
  await db.runAsync(`UPDATE transactions SET portfolio_id = ? WHERE portfolio_id IS NULL`, def.id);
  await db.execAsync(`CREATE INDEX IF NOT EXISTS ix_tx_portfolio ON transactions(portfolio_id);`);

  // --- Per-portfolio display currency (null = Default = USD) ---
  const pcols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(portfolios)`);
  if (!pcols.some((c) => c.name === "currency")) {
    await db.execAsync(`ALTER TABLE portfolios ADD COLUMN currency TEXT`);
  }
}

// --------------------------------------------------------------------------- //
// Portfolios
// --------------------------------------------------------------------------- //
export async function listPortfolios(): Promise<Portfolio[]> {
  const db = await getDb();
  return db.getAllAsync<Portfolio>(
    `SELECT * FROM portfolios ORDER BY sort_order ASC, id ASC`,
  );
}

export async function getPortfolioById(id: number): Promise<Portfolio | null> {
  const db = await getDb();
  return db.getFirstAsync<Portfolio>(`SELECT * FROM portfolios WHERE id = ?`, id);
}

export async function createPortfolio(name: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ m: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS m FROM portfolios`,
  );
  const res = await db.runAsync(
    `INSERT INTO portfolios (name, created_at, sort_order) VALUES (?, ?, ?)`,
    name.trim(), new Date().toISOString(), row ? row.m : 0,
  );
  return res.lastInsertRowId;
}

export async function renamePortfolio(id: number, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE portfolios SET name = ? WHERE id = ?`, name.trim(), id);
}

/** Set a portfolio's display currency. Pass null for "Default" (USD). */
export async function setPortfolioCurrency(id: number, currency: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE portfolios SET currency = ? WHERE id = ?`, currency, id);
}

/** Delete a portfolio and all its transactions. */
export async function deletePortfolio(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM transactions WHERE portfolio_id = ?`, id);
  await db.runAsync(`DELETE FROM portfolios WHERE id = ?`, id);
}

/** Convenience: id of the first portfolio (used as a default target). */
export async function defaultPortfolioId(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM portfolios ORDER BY sort_order ASC, id ASC LIMIT 1`,
  );
  if (row) return row.id;
  return createPortfolio("My Portfolio");
}

// --------------------------------------------------------------------------- //
// Transactions
// --------------------------------------------------------------------------- //
export async function insertTransaction(tx: TransactionInput): Promise<number> {
  const db = await getDb();
  const created = new Date().toISOString();
  // Never bind a null/NaN portfolio_id (SQLite can't bind those cleanly) — fall
  // back to the default bucket so a stray navigation can't wedge the save.
  const pid = Number.isFinite(tx.portfolio_id) ? tx.portfolio_id : await defaultPortfolioId();
  const res = await db.runAsync(
    `INSERT INTO transactions (portfolio_id, asset_type, key, name, currency, action, qty, price, trade_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    pid, tx.asset_type, tx.key, tx.name, tx.currency, tx.action, tx.qty, tx.price, tx.trade_date, created,
  );
  // Ensure an asset cache row exists.
  await upsertAsset({
    asset_type: tx.asset_type, key: tx.key, name: tx.name, currency: tx.currency,
  });
  return res.lastInsertRowId;
}

/** Insert many transactions + upsert their assets in a single DB transaction. */
export async function insertTransactionsBulk(
  txns: TransactionInput[],
): Promise<{ inserted: number; assets: Asset[] }> {
  if (txns.length === 0) return { inserted: 0, assets: [] };
  const db = await getDb();
  const created = new Date().toISOString();
  const fallbackPid = await defaultPortfolioId();
  const assetMap = new Map<string, Asset>();
  for (const tx of txns) {
    const pid = Number.isFinite(tx.portfolio_id) ? tx.portfolio_id : fallbackPid;
    await db.runAsync(
      `INSERT INTO transactions (portfolio_id, asset_type, key, name, currency, action, qty, price, trade_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      pid, tx.asset_type, tx.key, tx.name, tx.currency, tx.action, tx.qty, tx.price, tx.trade_date, created,
    );
    const k = `${tx.asset_type}:${tx.key}`;
    if (!assetMap.has(k)) {
      assetMap.set(k, {
        asset_type: tx.asset_type, key: tx.key, name: tx.name, currency: tx.currency,
      });
    }
  }
  for (const a of assetMap.values()) {
    await db.runAsync(
      `INSERT INTO assets (asset_type, key, name, currency) VALUES (?, ?, ?, ?)
       ON CONFLICT(asset_type, key) DO UPDATE SET name = excluded.name, currency = excluded.currency`,
      a.asset_type, a.key, a.name, a.currency,
    );
  }
  return { inserted: txns.length, assets: [...assetMap.values()] };
}

export async function updateTransaction(
  id: number,
  patch: Pick<Transaction, "action" | "qty" | "price" | "trade_date">,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE transactions SET action = ?, qty = ?, price = ?, trade_date = ? WHERE id = ?`,
    patch.action, patch.qty, patch.price, patch.trade_date, id,
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM transactions WHERE id = ?`, id);
}

export async function getTransaction(id: number): Promise<Transaction | null> {
  const db = await getDb();
  return db.getFirstAsync<Transaction>(`SELECT * FROM transactions WHERE id = ?`, id);
}

/** All transactions across every portfolio (used for dashboard aggregation). */
export async function listTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    `SELECT * FROM transactions ORDER BY trade_date DESC, id DESC`,
  );
}

export async function listTransactionsByPortfolio(portfolioId: number): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    `SELECT * FROM transactions WHERE portfolio_id = ? ORDER BY trade_date DESC, id DESC`,
    portfolioId,
  );
}

export async function listTransactionsByAsset(
  portfolioId: number,
  assetType: AssetType,
  key: string,
): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    `SELECT * FROM transactions WHERE portfolio_id = ? AND asset_type = ? AND key = ?
     ORDER BY trade_date DESC, id DESC`,
    portfolioId, assetType, key,
  );
}

// --------------------------------------------------------------------------- //
// Assets
// --------------------------------------------------------------------------- //
export async function upsertAsset(a: Asset): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO assets (asset_type, key, name, currency) VALUES (?, ?, ?, ?)
     ON CONFLICT(asset_type, key) DO UPDATE SET name = excluded.name, currency = excluded.currency`,
    a.asset_type, a.key, a.name, a.currency,
  );
}

export async function listAssets(): Promise<Asset[]> {
  const db = await getDb();
  return db.getAllAsync<Asset>(`SELECT * FROM assets ORDER BY key ASC`);
}

/** Delete a holding within a portfolio (removes that portfolio's transactions for
 * the asset). Global price/asset caches are left intact — they may be shared with
 * other portfolios and are harmless to keep. */
export async function deleteAsset(
  portfolioId: number, assetType: AssetType, key: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM transactions WHERE portfolio_id = ? AND asset_type = ? AND key = ?`,
    portfolioId, assetType, key,
  );
}

// --------------------------------------------------------------------------- //
// Prices
// --------------------------------------------------------------------------- //
export async function upsertPriceLatest(p: PriceLatest): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO price_latest (asset_type, key, price, prev_close, currency, as_of)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(asset_type, key) DO UPDATE SET
       price = excluded.price, prev_close = excluded.prev_close,
       currency = excluded.currency, as_of = excluded.as_of`,
    p.asset_type, p.key, p.price, p.prev_close, p.currency, p.as_of,
  );
}

export async function getAllPriceLatest(): Promise<PriceLatest[]> {
  const db = await getDb();
  return db.getAllAsync<PriceLatest>(`SELECT * FROM price_latest`);
}

export async function insertHistoryPoint(
  assetType: AssetType, key: string, ts: string, close: number,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO price_history (asset_type, key, ts, close) VALUES (?, ?, ?, ?)`,
    assetType, key, ts, close,
  );
}

export async function insertHistoryPoints(
  assetType: AssetType, key: string, points: HistoryPoint[],
): Promise<void> {
  if (points.length === 0) return;
  const db = await getDb();
  // Sequential inserts (no explicit transaction: expo-sqlite serializes each
  // call, and an explicit BEGIN/COMMIT can collide with the background refresh).
  for (const p of points) {
    await db.runAsync(
      `INSERT OR IGNORE INTO price_history (asset_type, key, ts, close) VALUES (?, ?, ?, ?)`,
      assetType, key, p.ts, p.close,
    );
  }
}

export async function getHistorySince(
  assetType: AssetType, key: string, sinceISO: string,
): Promise<HistoryPoint[]> {
  const db = await getDb();
  return db.getAllAsync<HistoryPoint>(
    `SELECT ts, close FROM price_history
     WHERE asset_type = ? AND key = ? AND ts >= ? ORDER BY ts ASC`,
    assetType, key, sinceISO,
  );
}

// --------------------------------------------------------------------------- //
// FX
// --------------------------------------------------------------------------- //
export async function insertFxRate(pair: string, rate: number, asOf: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO fx_rates (pair, rate, as_of) VALUES (?, ?, ?)`,
    pair, rate, asOf,
  );
}

export async function latestFxRate(pair: string): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ rate: number }>(
    `SELECT rate FROM fx_rates WHERE pair = ? ORDER BY as_of DESC LIMIT 1`, pair,
  );
  return row ? row.rate : null;
}

export async function fxRateAt(pair: string, ts: string): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ rate: number }>(
    `SELECT rate FROM fx_rates WHERE pair = ? AND as_of <= ? ORDER BY as_of DESC LIMIT 1`, pair, ts,
  );
  if (row) return row.rate;
  const first = await db.getFirstAsync<{ rate: number }>(
    `SELECT rate FROM fx_rates WHERE pair = ? ORDER BY as_of ASC LIMIT 1`, pair,
  );
  return first ? first.rate : null;
}

// --------------------------------------------------------------------------- //
// Settings
// --------------------------------------------------------------------------- //
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`, key,
  );
  return row ? row.value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key, value,
  );
}
