import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { orderedPair } from "@/lib/splits";
import { roleSatisfies } from "@/lib/notes";
import type { GroupMember, Note, NoteRole } from "@/generated/prisma";

// Returns the signed-in userId, or a 401 JSON response to short-circuit the handler.
export async function requireApiUser(): Promise<
  { userId: string } | { response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId: session.user.id };
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

// Confirms an accepted Friendship exists between the two users. Returns the
// friendship id or a 403 response. Same `{ ...ok } | { response }` shape as
// requireApiUser so routes reuse the `if ("response" in x)` idiom.
export async function requireFriendship(
  meId: string,
  otherId: string,
): Promise<{ friendshipId: string } | { response: NextResponse }> {
  if (meId === otherId) return { response: badRequest("You cannot split with yourself") };
  const [userAId, userBId] = orderedPair(meId, otherId);
  const friendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { id: true },
  });
  if (!friendship) return { response: forbidden("You are not friends with this user") };
  return { friendshipId: friendship.id };
}

// Confirms the user is an ACTIVE, ACCEPTED member of the group. Returns 404
// (not 403) when the group is missing or the caller isn't a member, so we don't
// leak the existence of groups the user can't see.
export async function requireGroupMember(
  groupId: string,
  userId: string,
): Promise<{ member: GroupMember } | { response: NextResponse }> {
  const member = await prisma.groupMember.findFirst({
    where: { groupId, userId, status: "ACTIVE", invite: "ACCEPTED" },
  });
  if (!member) return { response: notFound("Group not found") };
  return { member };
}

// Like requireGroupMember but also requires admin rights.
export async function requireGroupAdmin(
  groupId: string,
  userId: string,
): Promise<{ member: GroupMember } | { response: NextResponse }> {
  const result = await requireGroupMember(groupId, userId);
  if ("response" in result) return result;
  if (!result.member.isAdmin) return { response: forbidden("Admins only") };
  return result;
}

// Resolves a caller's access to a note. Returns the note plus the caller's
// effective role ("OWNER" | NoteRole), or a 404 response when the note is
// missing/trashed or the caller lacks at least `minRole` — 404 (not 403) so we
// never leak the existence of notes the user can't see. Owner outranks EDITOR
// which outranks VIEWER.
export async function requireNoteAccess(
  noteId: string,
  userId: string,
  minRole: NoteRole = "VIEWER",
): Promise<{ note: Note; role: "OWNER" | NoteRole } | { response: NextResponse }> {
  const note = await prisma.note.findFirst({ where: { id: noteId, deletedAt: null } });
  if (!note) return { response: notFound("Note not found") };

  if (note.ownerId === userId) return { note, role: "OWNER" };

  const collab = await prisma.noteCollaborator.findFirst({
    where: { noteId, userId, status: "ACCEPTED" },
    select: { role: true },
  });
  if (!collab || !roleSatisfies(collab.role, minRole)) {
    return { response: notFound("Note not found") };
  }
  return { note, role: collab.role };
}
