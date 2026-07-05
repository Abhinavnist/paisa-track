import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireFriendship, requireGroupMember } from "@/lib/api";
import { friendNetMinor, groupNetBalances } from "@/lib/balances";
import { toMajor } from "@/lib/splits";

// GET /api/balances                — overall summary across friends + groups
// GET /api/balances?friendId=...    — my net with one friend
// GET /api/balances?groupId=...     — my net in one group
export async function GET(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;

  const friendId = req.nextUrl.searchParams.get("friendId");
  const groupId = req.nextUrl.searchParams.get("groupId");

  if (friendId) {
    const guard = await requireFriendship(me, friendId);
    if ("response" in guard) return guard.response;
    return NextResponse.json({ balance: toMajor(await friendNetMinor(me, friendId)) });
  }

  if (groupId) {
    const guard = await requireGroupMember(groupId, me);
    if ("response" in guard) return guard.response;
    return NextResponse.json({ balance: toMajor((await groupNetBalances(groupId)).get(me) ?? 0) });
  }

  // Overall: sum my net across every friend and every group.
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: me }, { userBId: me }] },
    select: { userAId: true, userBId: true },
  });
  const memberships = await prisma.groupMember.findMany({
    where: { userId: me, status: "ACTIVE", invite: "ACCEPTED" },
    select: { groupId: true },
  });

  let netMinor = 0;
  for (const f of friendships) {
    const other = f.userAId === me ? f.userBId : f.userAId;
    netMinor += await friendNetMinor(me, other);
  }
  for (const m of memberships) {
    netMinor += (await groupNetBalances(m.groupId)).get(me) ?? 0;
  }

  return NextResponse.json({ net: toMajor(netMinor) });
}
