import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest } from "@/lib/api";
import { groupSchema } from "@/lib/validation";
import { groupNetBalances } from "@/lib/balances";
import { toMajor } from "@/lib/splits";

// GET /api/groups — groups I'm an active member of, with my net balance in each.
export async function GET() {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;

  const memberships = await prisma.groupMember.findMany({
    where: { userId: me, status: "ACTIVE", invite: "ACCEPTED" },
    include: {
      group: {
        include: { _count: { select: { members: { where: { status: "ACTIVE" } } } } },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const groups = await Promise.all(
    memberships.map(async (m) => {
      const net = (await groupNetBalances(m.groupId)).get(me) ?? 0;
      return {
        id: m.group.id,
        name: m.group.name,
        memberCount: m.group._count.members,
        balance: toMajor(net),
      };
    }),
  );

  return NextResponse.json({ groups });
}

// POST /api/groups — create a group; creator becomes an admin member.
export async function POST(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;

  const body = await req.json().catch(() => null);
  const parsed = groupSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const meUser = await prisma.user.findUnique({ where: { id: me }, select: { email: true } });
  if (!meUser) return badRequest("User not found");

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      createdById: me,
      members: {
        create: {
          userId: me,
          email: meUser.email.toLowerCase(),
          status: "ACTIVE",
          invite: "ACCEPTED",
          isAdmin: true,
        },
      },
    },
  });

  return NextResponse.json({ group }, { status: 201 });
}
