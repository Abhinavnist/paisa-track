import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest, notFound } from "@/lib/api";
import { respondInviteSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/notes/invites/[id] — accept or decline a note share invite.
// `id` is the NoteCollaborator id; it must belong to the caller and be pending.
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = respondInviteSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const invite = await prisma.noteCollaborator.findFirst({
    where: { id, userId: authResult.userId, status: "PENDING" },
    select: { id: true },
  });
  if (!invite) return notFound("Invite not found");

  const collaborator = await prisma.noteCollaborator.update({
    where: { id },
    data: {
      status: parsed.data.action === "accept" ? "ACCEPTED" : "DECLINED",
      respondedAt: new Date(),
    },
    select: { id: true, status: true },
  });
  return NextResponse.json({ collaborator });
}
