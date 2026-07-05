// Data-access layer that fetches shared expenses + settlements and hands plain
// objects to the pure functions in splits.ts. Never touches prisma.transaction.

import { prisma } from "@/lib/prisma";
import { netBalances, pairwiseBalances, toMinor, type Ledger } from "@/lib/splits";

type ExpenseWithShares = {
  paidById: string;
  shares: { userId: string; owedAmount: number }[];
};

function ledgerFrom(
  expenses: ExpenseWithShares[],
  settlements: { fromId: string; toId: string; amount: number }[],
): Ledger {
  return {
    shares: expenses.flatMap((e) =>
      e.shares.map((s) => ({
        paidById: e.paidById,
        userId: s.userId,
        owedMinor: toMinor(s.owedAmount),
      })),
    ),
    settlements: settlements.map((s) => ({
      fromId: s.fromId,
      toId: s.toId,
      amountMinor: toMinor(s.amount),
    })),
  };
}

// All 1-on-1 (groupId = null) expenses strictly between the two users.
async function friendLedger(meId: string, friendId: string): Promise<Ledger> {
  const pair = [meId, friendId];
  const expenses = await prisma.sharedExpense.findMany({
    where: { groupId: null, deletedAt: null, paidById: { in: pair } },
    select: { paidById: true, shares: { select: { userId: true, owedAmount: true } } },
  });
  // Keep only expenses whose every participant is within {me, friend}.
  const between = expenses.filter((e) => e.shares.every((s) => pair.includes(s.userId)));

  const settlements = await prisma.settlement.findMany({
    where: {
      groupId: null,
      OR: [
        { fromId: meId, toId: friendId },
        { fromId: friendId, toId: meId },
      ],
    },
    select: { fromId: true, toId: true, amount: true },
  });
  return ledgerFrom(between, settlements);
}

// Signed net (minor units) from me's perspective: positive => friend owes me.
export async function friendNetMinor(meId: string, friendId: string): Promise<number> {
  const ledger = await friendLedger(meId, friendId);
  return netBalances(ledger).get(meId) ?? 0;
}

export async function groupLedger(groupId: string): Promise<Ledger> {
  const expenses = await prisma.sharedExpense.findMany({
    where: { groupId, deletedAt: null },
    select: { paidById: true, shares: { select: { userId: true, owedAmount: true } } },
  });
  const settlements = await prisma.settlement.findMany({
    where: { groupId },
    select: { fromId: true, toId: true, amount: true },
  });
  return ledgerFrom(expenses, settlements);
}

// Net per user in a group (minor units). Positive => they are owed.
export async function groupNetBalances(groupId: string): Promise<Map<string, number>> {
  return netBalances(await groupLedger(groupId));
}

// Simplified "who pays whom" transfers for a group (minor units).
export async function groupSimplifiedDebts(groupId: string) {
  return pairwiseBalances(await groupLedger(groupId));
}
