import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest } from "@/lib/api";
import { noteTagSchema } from "@/lib/validation";

// GET /api/notes/tags — the caller's tags.
export async function GET() {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const tags = await prisma.noteTagLabel.findMany({
    where: { ownerId: authResult.userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });
  return NextResponse.json({ tags });
}

// POST /api/notes/tags
export async function POST(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const body = await req.json().catch(() => null);
  const parsed = noteTagSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const existing = await prisma.noteTagLabel.findFirst({
    where: { ownerId: authResult.userId, name: parsed.data.name },
    select: { id: true },
  });
  if (existing) return badRequest("A tag with that name already exists");

  const tag = await prisma.noteTagLabel.create({
    data: {
      ownerId: authResult.userId,
      name: parsed.data.name,
      color: parsed.data.color ?? null,
    },
    select: { id: true, name: true, color: true },
  });
  return NextResponse.json({ tag }, { status: 201 });
}
