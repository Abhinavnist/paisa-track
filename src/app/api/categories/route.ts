import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest } from "@/lib/api";
import { categorySchema } from "@/lib/validation";

// GET /api/categories
export async function GET() {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const categories = await prisma.category.findMany({
    where: { userId: authResult.userId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories });
}

// POST /api/categories
export async function POST(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const body = await req.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const exists = await prisma.category.findFirst({
    where: { userId: authResult.userId, name: parsed.data.name },
    select: { id: true },
  });
  if (exists) return badRequest("A category with that name already exists");

  const category = await prisma.category.create({
    data: {
      userId: authResult.userId,
      name: parsed.data.name,
      icon: parsed.data.icon ?? "Tag",
      color: parsed.data.color ?? "#64748b",
    },
  });
  return NextResponse.json({ category }, { status: 201 });
}
