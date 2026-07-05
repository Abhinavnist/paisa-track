import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireGroupAdmin, badRequest, notFound } from "@/lib/api";
import { groupNetBalances } from "@/lib/balances";

type Params = { params: Promise<{ id: string; memberId: string }> };

// DELETE /api/groups/:id/members/:memberId — remove a member (admin only).
// Soft-sets REMOVED so their historical shares stay intact. Blocked if they have
// an outstanding balance unless ?force=1.
export async function DELETE(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;
  const { id, memberId } = await params;

  const guard = await requireGroupAdmin(id, me);
  if ("response" in guard) return guard.response;

  const member = await prisma.groupMember.findFirst({ where: { id: memberId, groupId: id } });
  if (!member) return notFound("Member not found");
  if (member.userId === me) return badRequest("You can't remove yourself; delete the group instead");

  const force = req.nextUrl.searchParams.get("force") === "1";
  if (!force && member.userId) {
    const net = (await groupNetBalances(id)).get(member.userId) ?? 0;
    if (net !== 0) return badRequest("Settle this member's balance first");
  }

  await prisma.groupMember.update({ where: { id: memberId }, data: { status: "REMOVED" } });
  return NextResponse.json({ ok: true });
}
