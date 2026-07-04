"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, FormError } from "@/components/ui";
import { api } from "@/lib/client-api";

export type CategoryItem = { id: string; name: string; color: string };

const SWATCHES = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#64748b",
];

export function CategoryManager({ categories }: { categories: CategoryItem[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="space-y-4">
      <ul className="space-y-1">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-xl px-1 py-2">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="flex-1 text-sm text-slate-700">{c.name}</span>
            <button
              onClick={() => remove(c.id)}
              disabled={busy}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              aria-label={`Delete ${c.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="space-y-3 border-t border-slate-100 pt-4">
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
                (color === s ? "ring-2 ring-slate-900 ring-offset-2" : "")
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
