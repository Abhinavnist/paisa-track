import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api";
import { monthRange, currentYearMonth } from "@/lib/finance";
import { format } from "date-fns";

// Escape a value for CSV (quote if it contains comma/quote/newline).
function csvCell(value: string | number): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/export/csv?year=&month=  → downloadable CSV of that month's transactions.
export async function GET(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const sp = req.nextUrl.searchParams;
  const now = currentYearMonth();
  const year = Number(sp.get("year")) || now.year;
  const month = Number(sp.get("month")) || now.month;
  const { start, end } = monthRange(year, month);

  const rows = await prisma.transaction.findMany({
    where: { userId: authResult.userId, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
    include: { category: { select: { name: true } } },
  });

  const header = ["Date", "Type", "Category", "Note", "Amount", "Source"];
  const lines = rows.map((t) =>
    [
      format(t.date, "yyyy-MM-dd"),
      t.type,
      t.category?.name ?? "",
      t.note ?? "",
      t.amount,
      t.source,
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paisatrack-${year}-${String(month).padStart(2, "0")}.csv"`,
    },
  });
}
