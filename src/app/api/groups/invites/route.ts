import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api";

// GET /api/groups/invites — group invitations awaiting my response.
export async function GET() {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;

  const invites = await prisma.groupMember.findMany({
    where: { userId: me, status: "ACTIVE", invite: "PENDING" },
    include: {
      group: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: "desc" },
  });

  return NextResponse.json({ invites });
}
