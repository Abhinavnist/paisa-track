"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, FormError } from "@/components/ui";
import { api } from "@/lib/client-api";
import { currencyMeta } from "@/lib/currency";

export type CategoryItem = {
  id: string;
  name: string;
  color: string;
  monthlyBudget: number;
};

const SWATCHES = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#64748b",
];

export function CategoryManager({
  categories,
  currency,
}: {
  categories: CategoryItem[];
  currency: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [budgets, setBudgets] = useState<Record<string, string>>(
    Object.fromEntries(categories.map((c) => [c.id, c.monthlyBudget ? String(c.monthlyBudget) : ""])),
  );
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const symbol = currencyMeta(currency).symbol;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(undefined);
    setBusy(true);
    try {
      await api.createCategory({ name: name.trim(), color });
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await api.deleteCategory(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveBudget(id: string) {
    const value = Number(budgets[id]) || 0;
    const original = categories.find((c) => c.id === id)?.monthlyBudget ?? 0;
    if (value === original) return;
    try {
      await api.updateCategory(id, { monthlyBudget: value });
      router.refresh();
    } catch {
      // revert on failure
      setBudgets((b) => ({ ...b, [id]: original ? String(original) : "" }));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Set a monthly limit per category — leave blank for no limit.
      </p>
      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{c.name}</span>
            <div className="relative w-24">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                {symbol}
              </span>
              <input
                inputMode="decimal"
                value={budgets[c.id] ?? ""}
                onChange={(e) => setBudgets((b) => ({ ...b, [c.id]: e.target.value }))}
                onBlur={() => saveBudget(c.id)}
                placeholder="Budget"
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-5 pr-2 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button
              onClick={() => remove(c.id)}
              disabled={busy}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
              aria-label={`Delete ${c.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
        <FormError>{error}</FormError>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" />
        <div className="flex items-center gap-2">
          {SWATCHES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setColor(s)}
              className={
                "h-7 w-7 rounded-full transition " +
                (color === s ? "ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-800" : "")
              }
              style={{ backgroundColor: s }}
              aria-label={`Color ${s}`}
            />
          ))}
        </div>
        <Button type="submit" variant="outline" disabled={busy} className="w-full">
          <Plus className="h-4 w-4" /> Add category
        </Button>
      </form>
    </div>
  );
}
