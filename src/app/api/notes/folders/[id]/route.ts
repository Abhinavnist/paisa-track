import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest, notFound } from "@/lib/api";
import { noteFolderSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

async function ownFolder(id: string, ownerId: string) {
  return prisma.noteFolder.findFirst({ where: { id, ownerId }, select: { id: true } });
}

// PATCH /api/notes/folders/[id] — rename.
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = noteFolderSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  if (!(await ownFolder(id, authResult.userId))) return notFound("Folder not found");

  const clash = await prisma.noteFolder.findFirst({
    where: { ownerId: authResult.userId, name: parsed.data.name, id: { not: id } },
    select: { id: true },
  });
  if (clash) return badRequest("A folder with that name already exists");

  const folder = await prisma.noteFolder.update({
    where: { id },
    data: { name: parsed.data.name },
    select: { id: true, name: true },
  });
  return NextResponse.json({ folder });
}

// DELETE /api/notes/folders/[id] — notes keep existing (folderId set null via schema).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  if (!(await ownFolder(id, authResult.userId))) return notFound("Folder not found");

  await prisma.noteFolder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
