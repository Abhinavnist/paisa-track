import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireApiUser,
  requireFriendship,
  requireGroupMember,
  requireGroupAdmin,
  badRequest,
  notFound,
  forbidden,
} from "@/lib/api";
import { sharedExpenseSchema } from "@/lib/validation";
import { computeShares, toMinor, toMajor, type Participant, type SplitType } from "@/lib/splits";

type Params = { params: Promise<{ id: string }> };

const expenseInclude = {
  shares: { select: { userId: true, owedAmount: true, shareValue: true } },
  paidBy: { select: { id: true, name: true, email: true } },
} as const;

// Load a non-deleted expense and verify the caller may see it. Returns the
// expense + scope, or a NextResponse to short-circuit.
async function loadAuthorized(id: string, me: string) {
  const expense = await prisma.sharedExpense.findFirst({
    where: { id, deletedAt: null },
    include: expenseInclude,
  });
  if (!expense) return { response: notFound("Expense not found") };

  if (expense.groupId) {
    const guard = await requireGroupMember(expense.groupId, me);
    if ("response" in guard) return guard;
  } else {
    const others = new Set<string>([expense.paidById, ...expense.shares.map((s) => s.userId)]);
    others.delete(me);
    const other = [...others][0];
    if (!other) return { response: forbidden("Not your expense") };
    const guard = await requireFriendship(me, other);
    if ("response" in guard) return guard;
  }
  return { expense };
}

// GET /api/expenses/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  const loaded = await loadAuthorized(id, authResult.userId);
  if ("response" in loaded) return loaded.response;
  return NextResponse.json({ expense: loaded.expense });
}

// PATCH /api/expenses/:id — edit and re-derive shares. Group/friend scope is
// fixed (cannot move an expense between groups); participants stay within scope.
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;
  const { id } = await params;

  const loaded = await loadAuthorized(id, me);
  if ("response" in loaded) return loaded.response;
  const existing = loaded.expense;

  const body = await req.json().catch(() => null);
  const parsed = sharedExpenseSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
  const input = parsed.data;

  // Determine the allowed participant set from the existing scope.
  let allowed: string[];
  if (existing.groupId) {
    const members = await prisma.groupMember.findMany({
      where: { groupId: existing.groupId, status: "ACTIVE", invite: "ACCEPTED", userId: { not: null } },
      select: { userId: true },
    });
    allowed = members.map((m) => m.userId!).filter(Boolean);
  } else {
    const others = new Set<string>([existing.paidById, ...existing.shares.map((s) => s.userId)]);
    others.delete(me);
    allowed = [me, ...others];
  }

  if (!allowed.includes(input.paidById)) return badRequest("The payer must be part of this split");
  if (!input.participants.every((p) => allowed.includes(p.userId)))
    return badRequest("Every participant must be part of this split");

  const totalMinor = toMinor(input.amount);
  const shares = computeShares(
    totalMinor,
    input.splitType as SplitType,
    input.participants as Participant[],
  );
  if ([...shares.values()].reduce((s, x) => s + x, 0) !== totalMinor)
    return badRequest("The split does not add up to the total");

  const expense = await prisma.$transaction(async (tx) => {
    await tx.expenseShare.deleteMany({ where: { expenseId: id } });
    return tx.sharedExpense.update({
      where: { id },
      data: {
        paidById: input.paidById,
        amount: input.amount,
        description: input.description,
        splitType: input.splitType,
        date: input.date ?? existing.date,
        shares: {
          create: input.participants.map((p) => ({
            userId: p.userId,
            owedAmount: toMajor(shares.get(p.userId) ?? 0),
            shareValue: p.value ?? null,
          })),
        },
      },
      include: expenseInclude,
    });
  });

  return NextResponse.json({ expense });
}

// DELETE /api/expenses/:id — soft delete. Creator or payer, or a group admin.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;
  const { id } = await params;

  const loaded = await loadAuthorized(id, me);
  if ("response" in loaded) return loaded.response;
  const existing = loaded.expense;

  const isOwner = existing.createdById === me || existing.paidById === me;
  if (!isOwner) {
    if (!existing.groupId) return forbidden("Only the person who added it can delete it");
    const admin = await requireGroupAdmin(existing.groupId, me);
    if ("response" in admin) return admin.response;
  }

  await prisma.sharedExpense.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
