// On-device SQLite storage (expo-sqlite async API). All persistence lives here.
import * as SQLite from "expo-sqlite";

import type {
  Asset,
  AssetType,
  HistoryPoint,
  PriceLatest,
  Transaction,
  TransactionInput,
} from "./types";

const DB_NAME = "portfolio.db";
let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  // WAL for concurrent read/write; busy_timeout so a brief lock waits instead of
  // throwing "database is locked" (which was failing saves during a background refresh).
  await _db.execAsync("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 8000;");
  await migrate(_db);
  return _db;
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
  `);
}

// --------------------------------------------------------------------------- //
// Transactions
// --------------------------------------------------------------------------- //
export async function insertTransaction(tx: TransactionInput): Promise<number> {
  const db = await getDb();
  const created = new Date().toISOString();
  const res = await db.runAsync(
    `INSERT INTO transactions (asset_type, key, name, currency, action, qty, price, trade_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    tx.asset_type, tx.key, tx.name, tx.currency, tx.action, tx.qty, tx.price, tx.trade_date, created,
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
  const assetMap = new Map<string, Asset>();
  for (const tx of txns) {
    await db.runAsync(
      `INSERT INTO transactions (asset_type, key, name, currency, action, qty, price, trade_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      tx.asset_type, tx.key, tx.name, tx.currency, tx.action, tx.qty, tx.price, tx.trade_date, created,
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

export async function listTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    `SELECT * FROM transactions ORDER BY trade_date DESC, id DESC`,
  );
}

export async function listTransactionsByAsset(
  assetType: AssetType,
  key: string,
): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    `SELECT * FROM transactions WHERE asset_type = ? AND key = ? ORDER BY trade_date DESC, id DESC`,
    assetType, key,
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

/** Delete an asset and all its transactions + cached data. */
export async function deleteAsset(assetType: AssetType, key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM transactions WHERE asset_type = ? AND key = ?`, assetType, key);
  await db.runAsync(`DELETE FROM assets WHERE asset_type = ? AND key = ?`, assetType, key);
  await db.runAsync(`DELETE FROM price_latest WHERE asset_type = ? AND key = ?`, assetType, key);
  await db.runAsync(`DELETE FROM price_history WHERE asset_type = ? AND key = ?`, assetType, key);
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
