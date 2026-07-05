import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { orderedPair } from "@/lib/splits";
import type { GroupMember } from "@/generated/prisma";

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
