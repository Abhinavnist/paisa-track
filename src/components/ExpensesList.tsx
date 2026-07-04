"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { TransactionRow } from "@/components/TransactionRow";
import {
  TransactionForm,
  type CategoryLite,
  type EditableTx,
} from "@/components/TransactionForm";
import { api } from "@/lib/client-api";
import type { TxView } from "@/lib/types";

export function ExpensesList({
  transactions,
  categories,
  currency,
}: {
  transactions: TxView[];
  categories: CategoryLite[];
  currency: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TxView | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function remove(id: string) {
    setDeletingId(id);
    try {
      await api.deleteTransaction(id);
      router.refresh();
    } catch {
      setDeletingId(null);
    }
  }

  if (transactions.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-slate-400">
        No transactions this month. Tap ➕ to add one.
      </p>
    );
  }

  return (
    <>
      <div className="divide-y divide-slate-100">
        {transactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            tx={tx}
            currency={currency}
            action={
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setEditing(tx)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(tx.id)}
                  disabled={deletingId === tx.id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            }
          />
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit transaction">
        {editing && (
          <TransactionForm
            categories={categories}
            initial={toEditable(editing)}
            onSuccess={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function toEditable(tx: TxView): EditableTx {
  return {
    id: tx.id,
    amount: tx.amount,
    type: tx.type,
    categoryId: tx.category?.id ?? null,
    date: new Date(tx.date).toISOString().slice(0, 10),
    note: tx.note,
  };
}
