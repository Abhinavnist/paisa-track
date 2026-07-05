// Server-side helper to compute shares and persist a SharedExpense + its
// ExpenseShare rows atomically (prisma nested-create runs in one transaction).
// Never writes prisma.transaction — shared expenses stay off the personal ledger.

import { prisma } from "@/lib/prisma";
import { computeShares, toMinor, toMajor, type Participant, type SplitType } from "@/lib/splits";
import type { SharedExpenseInput } from "@/lib/validation";

export class ExpenseError extends Error {}

// `allowedUserIds` is the set the caller is authorized to split with (the two
// friends, or the group's active members). groupId is null for 1-on-1.
export async function createSharedExpense(
  meId: string,
  input: SharedExpenseInput,
  allowedUserIds: string[],
  groupId: string | null,
) {
  if (!allowedUserIds.includes(input.paidById)) {
    throw new ExpenseError("The payer must be part of this split");
  }
  for (const p of input.participants) {
    if (!allowedUserIds.includes(p.userId)) {
      throw new ExpenseError("Every participant must be part of this split");
    }
  }

  const totalMinor = toMinor(input.amount);
  const shares = computeShares(
    totalMinor,
    input.splitType as SplitType,
    input.participants as Participant[],
  );
  const sum = [...shares.values()].reduce((s, x) => s + x, 0);
  if (sum !== totalMinor) throw new ExpenseError("The split does not add up to the total");

  return prisma.sharedExpense.create({
    data: {
      groupId,
      paidById: input.paidById,
      amount: input.amount,
      description: input.description,
      splitType: input.splitType,
      date: input.date ?? new Date(),
      createdById: meId,
      shares: {
        create: input.participants.map((p) => ({
          userId: p.userId,
          owedAmount: toMajor(shares.get(p.userId) ?? 0),
          shareValue: p.value ?? null,
        })),
      },
    },
    include: {
      shares: { select: { userId: true, owedAmount: true } },
      paidBy: { select: { id: true, name: true, email: true } },
    },
  });
}
