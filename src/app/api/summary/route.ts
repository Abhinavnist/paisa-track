import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { getMonthlySummary, currentYearMonth } from "@/lib/finance";

// GET /api/summary?year=&month=  (defaults to current month)
export async function GET(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const sp = req.nextUrl.searchParams;
  const now = currentYearMonth();
  const year = Number(sp.get("year")) || now.year;
  const month = Number(sp.get("month")) || now.month;

  const summary = await getMonthlySummary(authResult.userId, year, month);
  return NextResponse.json({ summary });
}
