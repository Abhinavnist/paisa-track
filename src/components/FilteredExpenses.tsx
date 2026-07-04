"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input, Select } from "@/components/ui";
import { ExpensesList } from "@/components/ExpensesList";
import type { CategoryLite } from "@/components/TransactionForm";
import type { TxView } from "@/lib/types";

type TypeFilter = "ALL" | "EXPENSE" | "INCOME";

// Client-side search + filter over the loaded month's transactions.
export function FilteredExpenses({
  transactions,
  categories,
  currency,
}: {
  transactions: TxView[];
  categories: CategoryLite[];
  currency: string;
}) {
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  const active = q || categoryId !== "ALL" || type !== "ALL" || min || max;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const minN = min ? Number(min) : null;
    const maxN = max ? Number(max) : null;
    return transactions.filter((t) => {
      if (type !== "ALL" && t.type !== type) return false;
      if (categoryId !== "ALL" && t.category?.id !== categoryId) return false;
      if (minN !== null && t.amount < minN) return false;
      if (maxN !== null && t.amount > maxN) return false;
      if (needle) {
        const hay = `${t.note ?? ""} ${t.category?.name ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [transactions, q, categoryId, type, min, max]);

  function clear() {
    setQ("");
    setCategoryId("ALL");
    setType("ALL");
    setMin("");
    setMax("");
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search notes or category…"
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2">
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="ALL">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value as TypeFilter)}>
          <option value="ALL">All types</option>
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder="Min amount" />
        <Input inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} placeholder="Max amount" />
      </div>

      {active && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
          <button onClick={clear} className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
            <X className="h-3 w-3" /> Clear filters
          </button>
        </div>
      )}

      <div className="border-t border-slate-100 pt-1 dark:border-slate-700">
        <ExpensesList transactions={filtered} categories={categories} currency={currency} />
      </div>
    </div>
  );
}
