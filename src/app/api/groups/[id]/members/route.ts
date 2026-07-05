import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireGroupMember, requireGroupAdmin, badRequest } from "@/lib/api";
import { inviteEmailSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// GET /api/groups/:id/members
export async function GET(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;
  const { id } = await params;

  const guard = await requireGroupMember(id, me);
  if ("response" in guard) return guard.response;

  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return NextResponse.json({ members });
}

// POST /api/groups/:id/members — invite a member by email (admin only).
export async function POST(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;
  const { id } = await params;

  const guard = await requireGroupAdmin(id, me);
  if ("response" in guard) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = inviteEmailSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
  const email = parsed.data.email;

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_email: { groupId: id, email } },
    select: { id: true, status: true },
  });
  if (existing && existing.status === "ACTIVE")
    return badRequest("This person is already in the group");

  const invitee = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  const member = existing
    ? await prisma.groupMember.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", invite: "PENDING", userId: invitee?.id ?? null },
      })
    : await prisma.groupMember.create({
        data: { groupId: id, email, userId: invitee?.id ?? null, invite: "PENDING" },
      });

  return NextResponse.json({ member }, { status: 201 });
}
