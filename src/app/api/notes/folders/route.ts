import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest } from "@/lib/api";
import { noteFolderSchema } from "@/lib/validation";

// GET /api/notes/folders — the caller's folders with note counts.
export async function GET() {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const folders = await prisma.noteFolder.findMany({
    where: { ownerId: authResult.userId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { notes: { where: { deletedAt: null } } } },
    },
  });
  return NextResponse.json({
    folders: folders.map((f) => ({ id: f.id, name: f.name, count: f._count.notes })),
  });
}

// POST /api/notes/folders
export async function POST(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const body = await req.json().catch(() => null);
  const parsed = noteFolderSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const existing = await prisma.noteFolder.findFirst({
    where: { ownerId: authResult.userId, name: parsed.data.name },
    select: { id: true },
  });
  if (existing) return badRequest("A folder with that name already exists");

  const folder = await prisma.noteFolder.create({
    data: { ownerId: authResult.userId, name: parsed.data.name },
    select: { id: true, name: true },
  });
  return NextResponse.json({ folder }, { status: 201 });
}
