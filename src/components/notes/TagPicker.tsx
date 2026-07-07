"use client";

import { useEffect, useRef, useState } from "react";
import { Tag as TagIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteTagItem } from "@/lib/client-api";

// Compact multi-select for assigning the note's tags. Owner-only; the parent
// persists changes. Tags themselves are managed on the notes hub.
export function TagPicker({
  allTags,
  selected,
  onChange,
}: {
  allTags: NoteTagItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const label = selected.length ? `${selected.length} tag${selected.length > 1 ? "s" : ""}` : "Tags";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <TagIcon className="h-4 w-4" /> {label}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {allTags.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400">No tags yet. Create them on the Notes page.</p>
          )}
          {allTags.map((t) => {
            const on = selected.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700",
                  on ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color ?? "#64748b" }} />
                  {t.name}
                </span>
                {on && <Check className="h-4 w-4 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
