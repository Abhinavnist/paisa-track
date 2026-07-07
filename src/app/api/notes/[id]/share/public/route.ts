import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, forbidden, requireNoteAccess } from "@/lib/api";
import { newPublicToken } from "@/lib/notes";

type Params = { params: Promise<{ id: string }> };

async function ownerOnly(noteId: string, userId: string) {
  const access = await requireNoteAccess(noteId, userId, "VIEWER");
  if ("response" in access) return access;
  if (access.role !== "OWNER") return { response: forbidden("Only the owner can manage sharing") };
  return access;
}

// POST /api/notes/[id]/share/public — enable the public read-only link.
// Ensures a token exists (created once, reused across toggles) and flips isPublic on.
export async function POST(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  const owner = await ownerOnly(id, authResult.userId);
  if ("response" in owner) return owner.response;

  const token = owner.note.publicToken ?? newPublicToken();
  const note = await prisma.note.update({
    where: { id },
    data: { isPublic: true, publicToken: token },
    select: { id: true, isPublic: true, publicToken: true },
  });
  return NextResponse.json({ note });
}

// DELETE /api/notes/[id]/share/public — revoke public access (keeps the token
// so re-enabling reuses the same URL; rotate to invalidate old links).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  const owner = await ownerOnly(id, authResult.userId);
  if ("response" in owner) return owner.response;

  const note = await prisma.note.update({
    where: { id },
    data: { isPublic: false },
    select: { id: true, isPublic: true, publicToken: true },
  });
  return NextResponse.json({ note });
}
