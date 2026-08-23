// React Query hooks over the on-device DB + network refresh triggers.
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";

import {
  deleteAsset as dbDeleteAsset,
  deleteTransaction as dbDeleteTransaction,
  getTransaction,
  insertTransaction,
  insertTransactionsBulk,
  listTransactions,
  listTransactionsByAsset,
  updateTransaction as dbUpdateTransaction,
} from "@/db";
import type {
  AssetType,
  RangeKey,
  Transaction,
  TransactionInput,
} from "@/db/types";
import { getHistory, getPortfolio, reduceLots } from "@/services/portfolio";
import { pickAndParseTransactions } from "@/services/importTransactions";
import { refreshAll, refreshNewAsset } from "@/services/prices";
import { search as providerSearch } from "@/services/providers";

const FOREGROUND_REFRESH_MS = 15 * 60 * 1000; // 15 min while app is open

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["portfolio"] });
  qc.invalidateQueries({ queryKey: ["history"] });
  qc.invalidateQueries({ queryKey: ["transactions"] });
  qc.invalidateQueries({ queryKey: ["asset"] });
}

export function usePortfolio() {
  return useQuery({ queryKey: ["portfolio"], queryFn: getPortfolio });
}

export function useHistory(range: RangeKey) {
  return useQuery({ queryKey: ["history", range], queryFn: () => getHistory(range) });
}

export function useTransactions() {
  return useQuery({ queryKey: ["transactions"], queryFn: listTransactions });
}

export function useAssetDetail(assetType: AssetType, key: string) {
  return useQuery({
    queryKey: ["asset", assetType, key],
    queryFn: async () => {
      const txns = await listTransactionsByAsset(assetType, key);
      const { qty, costBasis } = reduceLots(txns);
      return { txns, qty, costBasis };
    },
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
    mutationFn: async (tx: TransactionInput) => {
      const id = await insertTransaction(tx);
      // fetch a price + backfill history for a possibly-new asset
      await refreshNewAsset({
        asset_type: tx.asset_type, key: tx.key, name: tx.name, currency: tx.currency,
      });
      return id;
    },
    onSuccess: () => invalidateAll(qc),
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
    mutationFn: (args: { assetType: AssetType; key: string }) =>
      dbDeleteAsset(args.assetType, args.key),
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
        const res = await insertTransactionsBulk(parsed.toInsert);
        inserted = res.inserted;
        for (const a of res.assets) {
          await refreshNewAsset(a); // price + history backfill (best-effort)
        }
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
