import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireFriendship, badRequest } from "@/lib/api";
import { friendNetMinor } from "@/lib/balances";
import { orderedPair } from "@/lib/splits";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/friends/:id — unfriend. Blocked if there's an outstanding balance
// unless ?force=1 is passed. Historical expenses/settlements are preserved.
export async function DELETE(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;
  const { id: friendId } = await params;

  const friendship = await requireFriendship(me, friendId);
  if ("response" in friendship) return friendship.response;

  const force = req.nextUrl.searchParams.get("force") === "1";
  if (!force) {
    const net = await friendNetMinor(me, friendId);
    if (net !== 0) return badRequest("Settle the outstanding balance first");
  }

  const [userAId, userBId] = orderedPair(me, friendId);
  await prisma.friendship.delete({ where: { userAId_userBId: { userAId, userBId } } });
  return NextResponse.json({ ok: true });
}
