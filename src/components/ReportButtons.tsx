"use client";

import { useState } from "react";
import { format } from "date-fns";
import { FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui";
import { generateStatementPDF } from "@/lib/statement";

type TxRow = {
  date: string;
  type: "INCOME" | "EXPENSE";
  note: string | null;
  amount: number;
  category: { name: string } | null;
};

export function ReportButtons({
  year,
  month,
  currency,
}: {
  year: number;
  month: number;
  currency: string;
}) {
  const [busy, setBusy] = useState<null | "pdf" | "csv">(null);
  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy");

  function downloadCSV() {
    setBusy("csv");
    // Route sets Content-Disposition: attachment, so this triggers a download.
    window.location.href = `/api/export/csv?year=${year}&month=${month}`;
    setTimeout(() => setBusy(null), 800);
  }

  async function downloadPDF() {
    setBusy("pdf");
    try {
      const [txRes, sumRes] = await Promise.all([
        fetch(`/api/transactions?year=${year}&month=${month}&limit=500`),
        fetch(`/api/summary?year=${year}&month=${month}`),
      ]);
      const { transactions } = (await txRes.json()) as { transactions: TxRow[] };
      const { summary } = await sumRes.json();

      generateStatementPDF({
        monthLabel,
        currency,
        userName: "",
        income: summary.income,
        expense: summary.expense,
        balance: summary.balance,
        budget: summary.budget,
        categories: summary.byCategory.map((c: { name: string; total: number }) => ({
          name: c.name,
          total: c.total,
        })),
        transactions: transactions.map((t) => ({
          date: format(new Date(t.date), "dd MMM"),
          type: t.type,
          category: t.category?.name ?? (t.type === "INCOME" ? "Income" : "—"),
          note: t.note ?? "",
          amount: t.amount,
        })),
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="outline" onClick={downloadPDF} disabled={busy !== null}>
        <FileText className="h-4 w-4" />
        {busy === "pdf" ? "Building…" : "PDF statement"}
      </Button>
      <Button variant="outline" onClick={downloadCSV} disabled={busy !== null}>
        <FileSpreadsheet className="h-4 w-4" />
        {busy === "csv" ? "…" : "Export CSV"}
      </Button>
    </div>
  );
}
