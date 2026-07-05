"use client";

import { useMemo, useState } from "react";
import { Button, Input, Label, Select, FormError } from "@/components/ui";
import { splits, type SharedExpenseInput } from "@/lib/client-api";
import { computeShares, toMinor, toMajor, type Participant, type SplitType } from "@/lib/splits";
import { formatMoney } from "@/lib/currency";

export type Person = { id: string; name: string | null; email: string };

const SPLIT_TYPES: { key: SplitType; label: string }[] = [
  { key: "EQUAL", label: "Equally" },
  { key: "EXACT", label: "Exact" },
  { key: "PERCENT", label: "Percent" },
  { key: "SHARES", label: "Shares" },
];

function personLabel(p: Person, meId: string) {
  if (p.id === meId) return "You";
  return p.name || p.email;
}

// One form for creating (and, when `expenseId` is given, editing) a shared
// expense. `scope` decides whether it posts to a group or a 1-on-1 friend.
export function AddSharedExpenseForm({
  people,
  meId,
  currency,
  scope,
  onSuccess,
}: {
  people: Person[];
  meId: string;
  currency: string;
  scope: { groupId: string } | { friendId: string };
  onSuccess: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState(meId);
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [selected, setSelected] = useState<Set<string>>(new Set(people.map((p) => p.id)));
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const total = Number(amount) || 0;

  const participants: Participant[] = useMemo(
    () =>
      people
        .filter((p) => selected.has(p.id))
        .map((p) => ({
          userId: p.id,
          value: splitType === "EQUAL" ? undefined : Number(values[p.id]) || 0,
        })),
    [people, selected, values, splitType],
  );

  // Live preview of each person's share (best-effort; server recomputes).
  const preview = useMemo(() => {
    if (total <= 0 || participants.length === 0) return null;
    try {
      if (splitType === "PERCENT") {
        const sum = participants.reduce((s, p) => s + (p.value ?? 0), 0);
        if (Math.abs(sum - 100) > 0.01) return null;
      }
      if (splitType === "EXACT") {
        const sum = participants.reduce((s, p) => s + (p.value ?? 0), 0);
        if (Math.round(sum * 100) !== Math.round(total * 100)) return null;
      }
      if (splitType === "SHARES" && participants.some((p) => (p.value ?? 0) <= 0)) return null;
      return computeShares(toMinor(total), splitType, participants);
    } catch {
      return null;
    }
  }, [total, participants, splitType]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!description.trim()) return setError("Enter a description");
    if (total <= 0) return setError("Enter an amount greater than 0");
    if (participants.length === 0) return setError("Select at least one participant");

    const body: SharedExpenseInput = {
      ...scope,
      amount: total,
      description: description.trim(),
      paidById,
      splitType,
      participants: participants.map((p) => ({
        userId: p.userId,
        ...(splitType === "EQUAL" ? {} : { value: p.value }),
      })),
    };

    setSaving(true);
    try {
      await splits.createExpense(body);
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

      <div>
        <Label htmlFor="desc">Description</Label>
        <Input
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Dinner"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amt">Amount</Label>
          <Input
            id="amt"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="paid">Paid by</Label>
          <Select id="paid" value={paidById} onChange={(e) => setPaidById(e.target.value)}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {personLabel(p, meId)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label>Split</Label>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
          {SPLIT_TYPES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSplitType(s.key)}
              className={
                "h-8 rounded-lg text-xs font-semibold transition " +
                (splitType === s.key
                  ? "bg-white text-emerald-600 shadow dark:bg-slate-900"
                  : "text-slate-500 dark:text-slate-300")
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Participants</Label>
        {people.map((p) => {
          const on = selected.has(p.id);
          const share = preview?.get(p.id);
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700"
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 accent-emerald-600"
              />
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">
                {personLabel(p, meId)}
              </span>
              {on && splitType !== "EQUAL" && (
                <Input
                  inputMode="decimal"
                  value={values[p.id] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
                  placeholder={splitType === "PERCENT" ? "%" : splitType === "SHARES" ? "shares" : "amount"}
                  className="h-9 w-24"
                />
              )}
              {on && share !== undefined && (
                <span className="w-20 text-right text-xs text-slate-400">
                  {formatMoney(toMajor(share), currency)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving…" : "Add expense"}
      </Button>
    </form>
  );
}
