"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

// Prev/next month navigator that drives the page via ?year=&month= query params.
export function MonthSwitcher({ year, month }: { year: number; month: number }) {
  const router = useRouter();

  function go(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    router.push(`/expenses?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800">
      <button
        onClick={() => go(-1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {format(new Date(year, month - 1, 1), "MMMM yyyy")}
      </span>
      <button
        onClick={() => go(1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
        aria-label="Next month"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
