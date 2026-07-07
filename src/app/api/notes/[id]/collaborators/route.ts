import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest, forbidden, requireNoteAccess, requireFriendship } from "@/lib/api";
import { addCollaboratorSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// POST /api/notes/[id]/collaborators — share a note (owner only).
// Either { friendId } (creates an ACCEPTED share with an existing friend) or
// { email } (creates a PENDING invite; reconcileInvites backfills userId on signup).
export async function POST(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { userId } = authResult;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = addCollaboratorSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
  const { email, friendId, role } = parsed.data;

  const access = await requireNoteAccess(id, userId, "VIEWER");
  if ("response" in access) return access.response;
  if (access.role !== "OWNER") return forbidden("Only the owner can share this note");

  let targetEmail: string;
  let targetUserId: string | null;
  let status: "PENDING" | "ACCEPTED";

  if (friendId) {
    const friendship = await requireFriendship(userId, friendId);
    if ("response" in friendship) return friendship.response;
    const friend = await prisma.user.findUnique({
      where: { id: friendId },
      select: { id: true, email: true },
    });
    if (!friend) return badRequest("Friend not found");
    targetEmail = friend.email.toLowerCase();
    targetUserId = friend.id;
    status = "ACCEPTED"; // already connected — no separate accept step
  } else {
    const meUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (meUser?.email?.toLowerCase() === email) return badRequest("You can't share with yourself");
    const existing = await prisma.user.findUnique({
      where: { email: email! },
      select: { id: true },
    });
    targetEmail = email!;
    targetUserId = existing?.id ?? null;
    status = "PENDING"; // invitee accepts from their invites list
  }

  const collaborator = await prisma.noteCollaborator.upsert({
    where: { noteId_email: { noteId: id, email: targetEmail } },
    update: { role, userId: targetUserId, status },
    create: { noteId: id, email: targetEmail, userId: targetUserId, role, status },
    select: { id: true, email: true, role: true, status: true, userId: true },
  });

  return NextResponse.json({ collaborator }, { status: 201 });
}
