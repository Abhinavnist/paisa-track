import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireGroupAdmin, notFound, forbidden } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/settlements/:id — undo a settlement. Allowed for whoever recorded
// it, either party, or a group admin.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;
  const { id } = await params;

  const s = await prisma.settlement.findUnique({ where: { id } });
  if (!s) return notFound("Settlement not found");

  const isParty = s.createdById === me || s.fromId === me || s.toId === me;
  if (!isParty) {
    if (!s.groupId) return forbidden("Not your settlement");
    const admin = await requireGroupAdmin(s.groupId, me);
    if ("response" in admin) return admin.response;
  }

  await prisma.settlement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
