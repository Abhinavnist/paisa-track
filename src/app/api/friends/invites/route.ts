import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest } from "@/lib/api";
import { inviteEmailSchema } from "@/lib/validation";
import { orderedPair } from "@/lib/splits";

// GET /api/friends/invites — my pending invites, both received and sent.
export async function GET() {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;

  const [received, sent] = await Promise.all([
    prisma.friendInvite.findMany({
      where: { inviteeId: me, status: "PENDING" },
      include: { inviter: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendInvite.findMany({
      where: { inviterId: me, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ received, sent });
}

// POST /api/friends/invites — invite a friend by email.
export async function POST(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;

  const body = await req.json().catch(() => null);
  const parsed = inviteEmailSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
  const email = parsed.data.email;

  const meUser = await prisma.user.findUnique({ where: { id: me }, select: { email: true } });
  if (meUser?.email?.toLowerCase() === email) return badRequest("You can't invite yourself");

  const invitee = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  // Already friends?
  if (invitee) {
    const [userAId, userBId] = orderedPair(me, invitee.id);
    const existing = await prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      select: { id: true },
    });
    if (existing) return badRequest("You are already friends");
  }

  // Duplicate invite?
  const dup = await prisma.friendInvite.findUnique({
    where: { inviterId_inviteeEmail: { inviterId: me, inviteeEmail: email } },
    select: { id: true, status: true },
  });
  if (dup && dup.status === "PENDING") return badRequest("You already invited this person");

  const invite = dup
    ? await prisma.friendInvite.update({
        where: { id: dup.id },
        data: { status: "PENDING", inviteeId: invitee?.id ?? null, respondedAt: null },
      })
    : await prisma.friendInvite.create({
        data: { inviterId: me, inviteeEmail: email, inviteeId: invitee?.id ?? null },
      });

  return NextResponse.json({ invite }, { status: 201 });
}
