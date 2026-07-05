import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest, notFound, forbidden } from "@/lib/api";
import { orderedPair } from "@/lib/splits";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/friends/invites/:id — invitee accepts or declines.
// Body: { action: "accept" | "decline" }
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;
  const { id } = await params;

  const invite = await prisma.friendInvite.findUnique({ where: { id } });
  if (!invite) return notFound("Invite not found");
  if (invite.inviteeId !== me) return forbidden("This invite isn't addressed to you");
  if (invite.status !== "PENDING") return badRequest("This invite was already handled");

  const body = await req.json().catch(() => null);
  const action = (body as { action?: string })?.action;
  if (action !== "accept" && action !== "decline") return badRequest("Invalid action");

  if (action === "decline") {
    await prisma.friendInvite.update({
      where: { id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  // Accept: create the friendship (ordered pair, idempotent) and mark accepted.
  const [userAId, userBId] = orderedPair(invite.inviterId, me);
  await prisma.$transaction([
    prisma.friendship.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: {},
    }),
    prisma.friendInvite.update({
      where: { id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

// DELETE /api/friends/invites/:id — inviter cancels a sent invite.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;
  const { id } = await params;

  const invite = await prisma.friendInvite.findUnique({ where: { id }, select: { inviterId: true } });
  if (!invite) return notFound("Invite not found");
  if (invite.inviterId !== me) return forbidden("You can only cancel your own invites");

  await prisma.friendInvite.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
