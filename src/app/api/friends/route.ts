import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api";
import { friendNetMinor } from "@/lib/balances";
import { toMajor } from "@/lib/splits";

// GET /api/friends — list accepted friends with my net balance to each
// (positive => they owe me).
export async function GET() {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;

  const rows = await prisma.friendship.findMany({
    where: { OR: [{ userAId: me }, { userBId: me }] },
    include: {
      userA: { select: { id: true, name: true, email: true, image: true } },
      userB: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const friends = await Promise.all(
    rows.map(async (r) => {
      const friend = r.userAId === me ? r.userB : r.userA;
      const net = await friendNetMinor(me, friend.id);
      return { ...friend, balance: toMajor(net) };
    }),
  );

  return NextResponse.json({ friends });
}
