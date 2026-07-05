import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest, notFound, forbidden } from "@/lib/api";

type Params = { params: Promise<{ memberId: string }> };

// PATCH /api/groups/invites/:memberId — accept or decline a group invitation.
// Body: { action: "accept" | "decline" }
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;
  const { memberId } = await params;

  const member = await prisma.groupMember.findUnique({ where: { id: memberId } });
  if (!member) return notFound("Invitation not found");
  if (member.userId !== me) return forbidden("This invitation isn't yours");
  if (member.invite !== "PENDING") return badRequest("This invitation was already handled");

  const body = await req.json().catch(() => null);
  const action = (body as { action?: string })?.action;
  if (action !== "accept" && action !== "decline") return badRequest("Invalid action");

  const member2 = await prisma.groupMember.update({
    where: { id: memberId },
    data:
      action === "accept"
        ? { invite: "ACCEPTED" }
        : { invite: "DECLINED", status: "REMOVED" },
  });

  return NextResponse.json({ member: member2 });
}
