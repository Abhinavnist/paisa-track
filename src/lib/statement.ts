import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Amounts are printed with the currency CODE (e.g. "INR 1,200.00") to avoid
// missing-glyph issues with symbols like ₹ in the default PDF font.
function money(amount: number, code: string): string {
  return `${code} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type StatementData = {
  monthLabel: string;
  currency: string;
  userName: string;
  income: number;
  expense: number;
  balance: number;
  budget: number;
  categories: { name: string; total: number }[];
  transactions: { date: string; type: string; category: string; note: string; amount: number }[];
};

// Builds and downloads a branded monthly statement PDF entirely in the browser.
export function generateStatementPDF(d: StatementData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const green: [number, number, number] = [5, 150, 105];

  // Header band
  doc.setFillColor(...green);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("PaisaTrack", 40, 38);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Statement — ${d.monthLabel}`, 40, 56);

  // Meta
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  doc.text(d.userName, doc.internal.pageSize.getWidth() - 40, 40, { align: "right" });

  // Summary block
  let y = 100;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 40, y);
  y += 10;
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 11 },
    body: [
      ["Income", money(d.income, d.currency)],
      ["Expenses", money(d.expense, d.currency)],
      ["Balance", money(d.balance, d.currency)],
      ["Budget", d.budget > 0 ? money(d.budget, d.currency) : "—"],
    ],
    columnStyles: { 0: { textColor: [100, 116, 139] }, 1: { fontStyle: "bold", halign: "right" } },
    tableWidth: 260,
  });

  // Category breakdown
  // @ts-expect-error autotable augments doc with lastAutoTable at runtime
  y = (doc.lastAutoTable?.finalY ?? y) + 24;
  if (d.categories.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Spending by category", 40, y);
    autoTable(doc, {
      startY: y + 8,
      head: [["Category", "Amount"]],
      body: d.categories.map((c) => [c.name, money(c.total, d.currency)]),
      headStyles: { fillColor: green },
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: "right" } },
    });
    // @ts-expect-error see above
    y = (doc.lastAutoTable?.finalY ?? y) + 24;
  }

  // Transactions
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Transactions", 40, y);
  autoTable(doc, {
    startY: y + 8,
    head: [["Date", "Type", "Category", "Note", "Amount"]],
    body: d.transactions.map((t) => [
      t.date,
      t.type === "INCOME" ? "Income" : "Expense",
      t.category,
      t.note,
      money(t.amount, d.currency),
    ]),
    headStyles: { fillColor: green },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 4: { halign: "right" } },
  });

  doc.save(`paisatrack-${d.monthLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
