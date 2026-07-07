import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest, notFound } from "@/lib/api";
import { noteTagSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

async function ownTag(id: string, ownerId: string) {
  return prisma.noteTagLabel.findFirst({ where: { id, ownerId }, select: { id: true } });
}

// PATCH /api/notes/tags/[id] — rename / recolor.
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = noteTagSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  if (!(await ownTag(id, authResult.userId))) return notFound("Tag not found");

  const clash = await prisma.noteTagLabel.findFirst({
    where: { ownerId: authResult.userId, name: parsed.data.name, id: { not: id } },
    select: { id: true },
  });
  if (clash) return badRequest("A tag with that name already exists");

  const tag = await prisma.noteTagLabel.update({
    where: { id },
    data: { name: parsed.data.name, color: parsed.data.color ?? null },
    select: { id: true, name: true, color: true },
  });
  return NextResponse.json({ tag });
}

// DELETE /api/notes/tags/[id] — join rows cascade via schema.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  if (!(await ownTag(id, authResult.userId))) return notFound("Tag not found");

  await prisma.noteTagLabel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
