import { Alert } from "react-native";

import type { Transaction } from "@/db/types";
import { formatQty, isoToDisplay } from "@/theme";

/** Show a confirmation dialog, then run onConfirm to delete the transaction. */
export function confirmDeleteTransaction(tx: Transaction, onConfirm: () => void): void {
  const label = `${tx.action === "buy" ? "Purchase" : "Sale"} of ${formatQty(tx.qty)} ${tx.key} on ${isoToDisplay(tx.trade_date)}`;
  Alert.alert("Delete transaction?", `${label}\n\nThis cannot be undone.`, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}
