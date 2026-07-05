"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Receipt } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { splits } from "@/lib/client-api";

export type FeedExpense = {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO
  paidBy: { id: string; name: string | null; email: string };
};

// List of shared expenses with an inline delete (soft) action.
export function ExpenseFeed({
  expenses,
  meId,
  currency,
}: {
  expenses: FeedExpense[];
  meId: string;
  currency: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    setBusy(id);
    try {
      await splits.deleteExpense(id);
      router.refresh();
    } catch {
      setBusy(null);
    }
  }

  if (expenses.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No expenses yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {expenses.map((e) => (
        <li
          key={e.id}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700">
            <Receipt className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
              {e.description}
            </p>
            <p className="text-xs text-slate-400">
              {(e.paidBy.id === meId ? "You" : e.paidBy.name || e.paidBy.email) + " paid • "}
              {new Date(e.date).toLocaleDateString()}
            </p>
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {formatMoney(e.amount, currency)}
          </span>
          <button
            onClick={() => remove(e.id)}
            disabled={busy === e.id}
            className="text-slate-300 hover:text-red-500 disabled:opacity-50"
            aria-label="Delete expense"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
