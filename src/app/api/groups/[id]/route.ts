import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireGroupMember, requireGroupAdmin, badRequest } from "@/lib/api";
import { groupSchema } from "@/lib/validation";
import { groupLedger } from "@/lib/balances";
import { netBalances, pairwiseBalances, toMajor } from "@/lib/splits";

type Params = { params: Promise<{ id: string }> };

// GET /api/groups/:id — detail: members, expenses, net balances, simplified debts.
export async function GET(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;
  const { id } = await params;

  const guard = await requireGroupMember(id, me);
  if ("response" in guard) return guard.response;

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        orderBy: { joinedAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      expenses: {
        where: { deletedAt: null },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: {
          shares: { select: { userId: true, owedAmount: true } },
          paidBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const ledger = await groupLedger(id);
  const net = netBalances(ledger);
  const balances = [...net.entries()].map(([userId, minor]) => ({ userId, amount: toMajor(minor) }));
  const debts = pairwiseBalances(ledger).map((t) => ({
    fromId: t.fromId,
    toId: t.toId,
    amount: toMajor(t.amountMinor),
  }));

  return NextResponse.json({ group, balances, debts, isAdmin: guard.member.isAdmin });
}

// PATCH /api/groups/:id — rename (admin only).
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;
  const { id } = await params;

  const guard = await requireGroupAdmin(id, me);
  if ("response" in guard) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = groupSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const group = await prisma.group.update({ where: { id }, data: { name: parsed.data.name } });
  return NextResponse.json({ group });
}

// DELETE /api/groups/:id — delete the group and its data (admin only).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const me = authResult.userId;
  const { id } = await params;

  const guard = await requireGroupAdmin(id, me);
  if ("response" in guard) return guard.response;

  await prisma.group.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
