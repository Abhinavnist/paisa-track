import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest } from "@/lib/api";
import { settingsSchema } from "@/lib/validation";

// GET /api/user
export async function GET() {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const user = await prisma.user.findUnique({
    where: { id: authResult.userId },
    select: {
      id: true,
      name: true,
      email: true,
      currency: true,
      monthlySalary: true,
      monthlyBudget: true,
      salaryCreditDay: true,
    },
  });
  return NextResponse.json({ user });
}

// PATCH /api/user
export async function PATCH(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const user = await prisma.user.update({
    where: { id: authResult.userId },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      email: true,
      currency: true,
      monthlySalary: true,
      monthlyBudget: true,
      salaryCreditDay: true,
    },
  });
  return NextResponse.json({ user });
}
