import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatMoney } from "@/lib/currency";
import type { TxView } from "@/lib/types";

// Presentational row for a single transaction. `action` renders trailing controls (edit/delete).
export function TransactionRow({
  tx,
  currency,
  action,
}: {
  tx: TxView;
  currency: string;
  action?: React.ReactNode;
}) {
  const isIncome = tx.type === "INCOME";
  const color = tx.category?.color ?? (isIncome ? "#10b981" : "#94a3b8");

  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        {isIncome ? (
          <ArrowDownRight className="h-5 w-5" />
        ) : (
          <CategoryIcon name={tx.category?.icon} className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {isIncome ? tx.note || "Income" : tx.category?.name ?? "Uncategorized"}
        </p>
        <p className="truncate text-xs text-slate-400">
          {tx.note && !isIncome ? `${tx.note} · ` : ""}
          {format(new Date(tx.date), "d MMM")}
          {tx.source === "AUTO_SALARY" ? " · Auto" : ""}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={
            "shrink-0 text-sm font-bold " +
            (isIncome ? "text-emerald-600" : "text-slate-800")
          }
        >
          {isIncome ? "+" : "−"}
          {formatMoney(tx.amount, currency)}
        </span>
        {action}
      </div>
    </div>
  );
}
