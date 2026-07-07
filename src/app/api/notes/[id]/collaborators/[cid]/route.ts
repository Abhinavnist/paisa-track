import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest, forbidden, notFound, requireNoteAccess } from "@/lib/api";
import { updateCollaboratorSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string; cid: string }> };

async function requireOwner(noteId: string, userId: string) {
  const access = await requireNoteAccess(noteId, userId, "VIEWER");
  if ("response" in access) return access;
  if (access.role !== "OWNER") return { response: forbidden("Only the owner can manage sharing") };
  return access;
}

// PATCH /api/notes/[id]/collaborators/[cid] — change a collaborator's role.
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id, cid } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateCollaboratorSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const owner = await requireOwner(id, authResult.userId);
  if ("response" in owner) return owner.response;

  const collab = await prisma.noteCollaborator.findFirst({
    where: { id: cid, noteId: id },
    select: { id: true },
  });
  if (!collab) return notFound("Collaborator not found");

  const collaborator = await prisma.noteCollaborator.update({
    where: { id: cid },
    data: { role: parsed.data.role },
    select: { id: true, email: true, role: true, status: true, userId: true },
  });
  return NextResponse.json({ collaborator });
}

// DELETE /api/notes/[id]/collaborators/[cid] — remove a collaborator.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id, cid } = await params;

  const owner = await requireOwner(id, authResult.userId);
  if ("response" in owner) return owner.response;

  const collab = await prisma.noteCollaborator.findFirst({
    where: { id: cid, noteId: id },
    select: { id: true },
  });
  if (!collab) return notFound("Collaborator not found");

  await prisma.noteCollaborator.delete({ where: { id: cid } });
  return NextResponse.json({ ok: true });
}
