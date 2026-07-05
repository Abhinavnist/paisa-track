import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireFriendship, requireGroupMember, badRequest } from "@/lib/api";
import { settlementSchema } from "@/lib/validation";

const settlementInclude = {
  from: { select: { id: true, name: true, email: true } },
  to: { select: { id: true, name: true, email: true } },
} as const;

// GET /api/settlements?groupId= | ?friendId=
export async function GET(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;

  const groupId = req.nextUrl.searchParams.get("groupId");
  const friendId = req.nextUrl.searchParams.get("friendId");

  if (groupId) {
    const guard = await requireGroupMember(groupId, me);
    if ("response" in guard) return guard.response;
    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: settlementInclude,
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ settlements });
  }

  if (friendId) {
    const guard = await requireFriendship(me, friendId);
    if ("response" in guard) return guard.response;
    const settlements = await prisma.settlement.findMany({
      where: {
        groupId: null,
        OR: [
          { fromId: me, toId: friendId },
          { fromId: friendId, toId: me },
        ],
      },
      include: settlementInclude,
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ settlements });
  }

  return badRequest("Provide a groupId or friendId");
}

// POST /api/settlements — record a payment between two people.
export async function POST(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;

  const body = await req.json().catch(() => null);
  const parsed = settlementSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
  const input = parsed.data;

  // Both parties must be within the scope, and the caller must be one of them.
  if (input.fromId !== me && input.toId !== me)
    return badRequest("You can only record settlements you're part of");

  let groupId: string | null;
  if (input.groupId) {
    const guard = await requireGroupMember(input.groupId, me);
    if ("response" in guard) return guard.response;
    const ids = new Set(
      (
        await prisma.groupMember.findMany({
          where: { groupId: input.groupId, status: "ACTIVE", invite: "ACCEPTED", userId: { not: null } },
          select: { userId: true },
        })
      ).map((m) => m.userId!),
    );
    if (!ids.has(input.fromId) || !ids.has(input.toId))
      return badRequest("Both people must be group members");
    groupId = input.groupId;
  } else {
    const other = input.fromId === me ? input.toId : input.fromId;
    const guard = await requireFriendship(me, other);
    if ("response" in guard) return guard.response;
    groupId = null;
  }

  const settlement = await prisma.settlement.create({
    data: {
      groupId,
      fromId: input.fromId,
      toId: input.toId,
      amount: input.amount,
      note: input.note ?? null,
      date: input.date ?? new Date(),
      createdById: me,
    },
    include: settlementInclude,
  });

  return NextResponse.json({ settlement }, { status: 201 });
}
