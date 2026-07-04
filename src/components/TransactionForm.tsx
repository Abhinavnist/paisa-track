"use client";

import { useState } from "react";
import { Button, Input, Label, Select, FormError } from "@/components/ui";
import { api } from "@/lib/client-api";

export type CategoryLite = { id: string; name: string; color: string };

export type EditableTx = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId: string | null;
  date: string; // yyyy-mm-dd
  note: string | null;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionForm({
  categories,
  initial,
  onSuccess,
}: {
  categories: CategoryLite[];
  initial?: EditableTx;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">(initial?.type ?? "EXPENSE");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const value = Number(amount);
    if (!value || value <= 0) return setError("Enter an amount greater than 0");

    setSaving(true);
    try {
      const body = {
        amount: value,
        type,
        categoryId: type === "EXPENSE" ? categoryId || null : null,
        date: new Date(date).toISOString(),
        note: note.trim() || null,
      };
      if (initial) await api.updateTransaction(initial.id, body);
      else await api.createTransaction(body);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormError>{error}</FormError>

      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        {(["EXPENSE", "INCOME"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={
              "h-9 rounded-lg text-sm font-semibold transition " +
              (type === t
                ? t === "EXPENSE"
                  ? "bg-white text-red-600 shadow"
                  : "bg-white text-emerald-600 shadow"
                : "text-slate-500")
            }
          >
            {t === "EXPENSE" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          autoFocus
        />
      </div>

      {type === "EXPENSE" && (
        <div>
          <Label htmlFor="category">Category</Label>
          <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Lunch with team" />
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving…" : initial ? "Save changes" : "Add"}
      </Button>
    </form>
  );
}
