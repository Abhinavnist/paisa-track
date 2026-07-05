import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireFriendship, requireGroupMember, badRequest } from "@/lib/api";
import { sharedExpenseSchema } from "@/lib/validation";
import { createSharedExpense, ExpenseError } from "@/lib/expenses";

const expenseInclude = {
  shares: { select: { userId: true, owedAmount: true, shareValue: true } },
  paidBy: { select: { id: true, name: true, email: true } },
} as const;

// Active accepted members of a group, as user ids (dedup, non-null).
async function groupMemberIds(groupId: string): Promise<string[]> {
  const members = await prisma.groupMember.findMany({
    where: { groupId, status: "ACTIVE", invite: "ACCEPTED", userId: { not: null } },
    select: { userId: true },
  });
  return members.map((m) => m.userId!).filter(Boolean);
}

// GET /api/expenses?groupId= | ?friendId= — list shared expenses in scope.
export async function GET(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;

  const groupId = req.nextUrl.searchParams.get("groupId");
  const friendId = req.nextUrl.searchParams.get("friendId");

  if (groupId) {
    const guard = await requireGroupMember(groupId, me);
    if ("response" in guard) return guard.response;
    const expenses = await prisma.sharedExpense.findMany({
      where: { groupId, deletedAt: null },
      include: expenseInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ expenses });
  }

  if (friendId) {
    const guard = await requireFriendship(me, friendId);
    if ("response" in guard) return guard.response;
    const pair = [me, friendId];
    const all = await prisma.sharedExpense.findMany({
      where: { groupId: null, deletedAt: null, paidById: { in: pair } },
      include: expenseInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    const expenses = all.filter((e) => e.shares.every((s) => pair.includes(s.userId)));
    return NextResponse.json({ expenses });
  }

  return badRequest("Provide a groupId or friendId");
}

// POST /api/expenses — create a shared expense (validates split, computes shares).
export async function POST(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;

  const body = await req.json().catch(() => null);
  const parsed = sharedExpenseSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
  const input = parsed.data;

  let allowed: string[];
  let groupId: string | null;

  if (input.groupId) {
    const guard = await requireGroupMember(input.groupId, me);
    if ("response" in guard) return guard.response;
    allowed = await groupMemberIds(input.groupId);
    groupId = input.groupId;
  } else {
    const guard = await requireFriendship(me, input.friendId!);
    if ("response" in guard) return guard.response;
    allowed = [me, input.friendId!];
    groupId = null;
  }

  try {
    const expense = await createSharedExpense(me, input, allowed, groupId);
    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    if (err instanceof ExpenseError) return badRequest(err.message);
    throw err;
  }
}
