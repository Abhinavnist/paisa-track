import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, notFound } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

// POST /api/notes/[id]/restore — bring a note back from trash (owner only).
// requireNoteAccess filters out trashed notes, so this checks ownership directly.
export async function POST(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  const note = await prisma.note.findFirst({
    where: { id, ownerId: authResult.userId, deletedAt: { not: null } },
    select: { id: true },
  });
  if (!note) return notFound("Note not found");

  await prisma.note.update({ where: { id }, data: { deletedAt: null } });
  return NextResponse.json({ ok: true });
}
