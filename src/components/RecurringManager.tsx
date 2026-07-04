"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Repeat } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Input, Label, Select, FormError } from "@/components/ui";
import { api } from "@/lib/client-api";
import { formatMoney } from "@/lib/currency";
import type { CategoryLite } from "@/components/TransactionForm";

export type RuleView = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId: string | null;
  categoryName: string | null;
  note: string | null;
  frequency: "MONTHLY" | "WEEKLY";
  dayOfMonth: number;
  weekday: number;
  active: boolean;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function RecurringManager({
  rules,
  categories,
  currency,
}: {
  rules: RuleView[];
  categories: CategoryLite[];
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RuleView | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(id: string) {
    setBusyId(id);
    try {
      await api.deleteRecurring(id);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function scheduleLabel(r: RuleView) {
    return r.frequency === "MONTHLY"
      ? `Monthly · day ${r.dayOfMonth}`
      : `Weekly · ${WEEKDAYS[r.weekday]}`;
  }

  return (
    <div className="space-y-3">
      {rules.length === 0 ? (
        <p className="py-2 text-sm text-slate-400 dark:text-slate-500">
          No recurring rules yet. Add rent, EMIs or subscriptions to auto-post them.
        </p>
      ) : (
        <ul className="space-y-1">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl px-1 py-2">
              <span
                className={
                  "flex h-9 w-9 items-center justify-center rounded-full " +
                  (r.type === "INCOME"
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300")
                }
              >
                <Repeat className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {r.note || r.categoryName || (r.type === "INCOME" ? "Income" : "Expense")}
                  {!r.active && <span className="ml-2 text-xs text-slate-400">(paused)</span>}
                </p>
                <p className="truncate text-xs text-slate-400">{scheduleLabel(r)}</p>
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {formatMoney(r.amount, currency)}
              </span>
              <button
                onClick={() => { setEditing(r); setOpen(true); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(r.id)}
                disabled={busyId === r.id}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button variant="outline" className="w-full" onClick={() => { setEditing(null); setOpen(true); }}>
        <Plus className="h-4 w-4" /> Add recurring
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit recurring" : "Add recurring"}
      >
        <RecurringForm
          categories={categories}
          initial={editing}
          onSuccess={() => { setOpen(false); router.refresh(); }}
        />
      </Modal>
    </div>
  );
}

function RecurringForm({
  categories,
  initial,
  onSuccess,
}: {
  categories: CategoryLite[];
  initial: RuleView | null;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">(initial?.type ?? "EXPENSE");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [frequency, setFrequency] = useState<"MONTHLY" | "WEEKLY">(initial?.frequency ?? "MONTHLY");
  const [dayOfMonth, setDayOfMonth] = useState(String(initial?.dayOfMonth ?? 1));
  const [weekday, setWeekday] = useState(String(initial?.weekday ?? 1));
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
        note: note.trim() || null,
        frequency,
        dayOfMonth: Number(dayOfMonth) || 1,
        weekday: Number(weekday),
      };
      if (initial) await api.updateRecurring(initial.id, body);
      else await api.createRecurring(body);
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

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
        {(["EXPENSE", "INCOME"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={
              "h-9 rounded-lg text-sm font-semibold transition " +
              (type === t
                ? "bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-white"
                : "text-slate-500")
            }
          >
            {t === "EXPENSE" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      <div>
        <Label htmlFor="r-amount">Amount</Label>
        <Input id="r-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus />
      </div>

      {type === "EXPENSE" && (
        <div>
          <Label htmlFor="r-cat">Category</Label>
          <Select id="r-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="r-freq">Repeats</Label>
        <Select id="r-freq" value={frequency} onChange={(e) => setFrequency(e.target.value as "MONTHLY" | "WEEKLY")}>
          <option value="MONTHLY">Every month</option>
          <option value="WEEKLY">Every week</option>
        </Select>
      </div>

      {frequency === "MONTHLY" ? (
        <div>
          <Label htmlFor="r-day">On day of month (1–28)</Label>
          <Input id="r-day" type="number" min={1} max={28} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
        </div>
      ) : (
        <div>
          <Label htmlFor="r-wd">On weekday</Label>
          <Select id="r-wd" value={weekday} onChange={(e) => setWeekday(e.target.value)}>
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="r-note">Note (optional)</Label>
        <Input id="r-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Room rent" />
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving…" : initial ? "Save changes" : "Add recurring"}
      </Button>
    </form>
  );
}
