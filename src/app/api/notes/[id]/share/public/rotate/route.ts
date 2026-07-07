import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, forbidden, requireNoteAccess } from "@/lib/api";
import { newPublicToken } from "@/lib/notes";

type Params = { params: Promise<{ id: string }> };

// POST /api/notes/[id]/share/public/rotate — issue a fresh token, invalidating
// any previously shared public URL. Keeps isPublic as-is (owner only).
export async function POST(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  const access = await requireNoteAccess(id, authResult.userId, "VIEWER");
  if ("response" in access) return access.response;
  if (access.role !== "OWNER") return forbidden("Only the owner can manage sharing");

  const note = await prisma.note.update({
    where: { id },
    data: { publicToken: newPublicToken() },
    select: { id: true, isPublic: true, publicToken: true },
  });
  return NextResponse.json({ note });
}
