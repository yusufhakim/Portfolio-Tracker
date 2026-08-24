// React Query hooks over the on-device DB + network refresh triggers.
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";

import {
  createPortfolio as dbCreatePortfolio,
  defaultPortfolioId,
  deleteAsset as dbDeleteAsset,
  deletePortfolio as dbDeletePortfolio,
  deleteTransaction as dbDeleteTransaction,
  getPortfolioById,
  getTransaction,
  insertTransaction,
  insertTransactionsBulk,
  listPortfolios,
  listTransactions,
  listTransactionsByAsset,
  renamePortfolio as dbRenamePortfolio,
  updateTransaction as dbUpdateTransaction,
} from "@/db";
import type {
  AssetType,
  RangeKey,
  Transaction,
  TransactionInput,
} from "@/db/types";
import {
  getHistory,
  getPortfolio,
  listPortfoliosWithValue,
  reduceLots,
} from "@/services/portfolio";
import { pickAndParseTransactions } from "@/services/importTransactions";
import { refreshAll, refreshNewAsset } from "@/services/prices";
import { search as providerSearch } from "@/services/providers";
import { getIndices, type Market as IndexMarket } from "@/services/providers/indices";

const FOREGROUND_REFRESH_MS = 15 * 60 * 1000; // 15 min while app is open

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["portfolio"] });
  qc.invalidateQueries({ queryKey: ["portfolios"] });
  qc.invalidateQueries({ queryKey: ["history"] });
  qc.invalidateQueries({ queryKey: ["transactions"] });
  qc.invalidateQueries({ queryKey: ["asset"] });
}

/** Every portfolio with its current USD value + daily change (dashboard). */
export function usePortfolios() {
  return useQuery({ queryKey: ["portfolios"], queryFn: listPortfoliosWithValue });
}

/** One portfolio's row record (name etc.). */
export function usePortfolioMeta(portfolioId: number) {
  return useQuery({
    queryKey: ["portfolio-meta", portfolioId],
    queryFn: () => getPortfolioById(portfolioId),
    enabled: Number.isFinite(portfolioId),
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => dbCreatePortfolio(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolios"] }),
  });
}

export function useRenamePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; name: string }) => dbRenamePortfolio(args.id, args.name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolios"] });
      qc.invalidateQueries({ queryKey: ["portfolio-meta"] });
    },
  });
}

export function useDeletePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => dbDeletePortfolio(id),
    onSuccess: () => invalidateAll(qc),
  });
}

/** Live market indices for a market ("us" | "in"). Ephemeral (Yahoo). */
export function useIndices(market: IndexMarket) {
  return useQuery({
    queryKey: ["indices", market],
    queryFn: () => getIndices(market),
    refetchInterval: 5 * 60 * 1000, // refresh while foregrounded
    staleTime: 60 * 1000,
  });
}

export function usePortfolio(portfolioId: number) {
  return useQuery({
    queryKey: ["portfolio", portfolioId],
    queryFn: () => getPortfolio(portfolioId),
    enabled: Number.isFinite(portfolioId),
  });
}

export function useHistory(portfolioId: number, range: RangeKey) {
  return useQuery({
    queryKey: ["history", portfolioId, range],
    queryFn: () => getHistory(portfolioId, range),
    enabled: Number.isFinite(portfolioId),
  });
}

export function useTransactions(portfolioId?: number) {
  return useQuery({
    queryKey: ["transactions", portfolioId ?? "all"],
    queryFn: async () => {
      const all = await listTransactions();
      return portfolioId === undefined
        ? all
        : all.filter((t) => t.portfolio_id === portfolioId);
    },
  });
}

export function useAssetDetail(portfolioId: number, assetType: AssetType, key: string) {
  return useQuery({
    queryKey: ["asset", portfolioId, assetType, key],
    queryFn: async () => {
      const txns = await listTransactionsByAsset(portfolioId, assetType, key);
      const { qty, costBasis } = reduceLots(txns);
      return { txns, qty, costBasis };
    },
    enabled: Number.isFinite(portfolioId),
  });
}

export function useSearch(market: "us" | "in_mf", query: string) {
  return useQuery({
    queryKey: ["search", market, query],
    queryFn: () => providerSearch(market, query),
    enabled: query.trim().length > 0,
  });
}

export function useAddTransaction() {
  const qc = useQueryClient();
  return useMutation({
    // The SAVE is only the DB insert — it must not fail because of the network.
    mutationFn: (tx: TransactionInput) => insertTransaction(tx),
    onSuccess: (_id, tx) => {
      invalidateAll(qc);
      // Fetch price + history in the background; never blocks or fails the save.
      refreshNewAsset({
        asset_type: tx.asset_type, key: tx.key, name: tx.name, currency: tx.currency,
      })
        .then(() => invalidateAll(qc))
        .catch(() => {});
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: number;
      patch: Pick<Transaction, "action" | "qty" | "price" | "trade_date">;
    }) => dbUpdateTransaction(args.id, args.patch),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => dbDeleteTransaction(id),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { portfolioId: number; assetType: AssetType; key: string }) =>
      dbDeleteAsset(args.portfolioId, args.assetType, args.key),
    onSuccess: () => invalidateAll(qc),
  });
}

export { getTransaction };

export interface ImportSummary {
  canceled: boolean;
  inserted: number;
  errors: string[];
  totalRows: number;
}

/** Pick an Excel/CSV file, import its transactions, and refresh prices. */
export function useImportTransactions() {
  const qc = useQueryClient();
  return useMutation<ImportSummary>({
    mutationFn: async () => {
      const parsed = await pickAndParseTransactions();
      if (parsed.canceled) {
        return { canceled: true, inserted: 0, errors: [], totalRows: 0 };
      }
      let inserted = 0;
      if (parsed.toInsert.length > 0) {
        // Resolve each row's portfolio name to an id, creating buckets on demand.
        // Blank names fall back to the default portfolio. Matching is case-insensitive.
        const existing = await listPortfolios();
        const byName = new Map<string, number>();
        for (const pf of existing) byName.set(pf.name.trim().toLowerCase(), pf.id);
        const fallbackId = await defaultPortfolioId();

        const rows: TransactionInput[] = [];
        for (const r of parsed.toInsert) {
          const { portfolioName, ...tx } = r;
          let pid: number;
          if (!portfolioName) {
            pid = fallbackId;
          } else {
            const norm = portfolioName.toLowerCase();
            const found = byName.get(norm);
            if (found !== undefined) {
              pid = found;
            } else {
              pid = await dbCreatePortfolio(portfolioName);
              byName.set(norm, pid);
            }
          }
          rows.push({ ...tx, portfolio_id: pid });
        }

        const res = await insertTransactionsBulk(rows);
        inserted = res.inserted;
        qc.invalidateQueries({ queryKey: ["portfolios"] });
        // Fetch prices/history in the background; don't fail the import if the
        // network is unavailable.
        Promise.allSettled(res.assets.map((a) => refreshNewAsset(a)))
          .then(() => invalidateAll(qc))
          .catch(() => {});
      }
      return {
        canceled: false,
        inserted,
        errors: parsed.errors,
        totalRows: parsed.totalRows,
      };
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Trigger a full network refresh then refresh the queries. */
export function useManualRefresh() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => refreshAll(),
    onSuccess: () => invalidateAll(qc),
  });
}

/** Refresh prices on mount, when app returns to foreground, and every 15 min. */
export function useAutoRefresh() {
  const qc = useQueryClient();
  useEffect(() => {
    let mounted = true;
    const run = () => {
      refreshAll().then(() => {
        if (mounted) invalidateAll(qc);
      });
    };
    run();
    const interval = setInterval(run, FOREGROUND_REFRESH_MS);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });
    return () => {
      mounted = false;
      clearInterval(interval);
      sub.remove();
    };
  }, [qc]);
}
