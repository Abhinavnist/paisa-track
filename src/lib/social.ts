// Helpers for the Splitwise feature that touch multiple users but don't belong
// to a single route. Kept separate from the pure math in splits.ts.

import type { PrismaClient } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

// When a user signs up (or a new email is first seen), back-fill any pending
// invites that were addressed to their email before they had an account, so the
// invites show up in their pending lists. Safe to call more than once.
export async function reconcileInvites(
  userId: string,
  email: string,
  db: PrismaClient = prisma,
): Promise<void> {
  const lower = email.trim().toLowerCase();
  await db.$transaction([
    db.friendInvite.updateMany({
      where: { inviteeEmail: lower, inviteeId: null },
      data: { inviteeId: userId },
    }),
    db.groupMember.updateMany({
      where: { email: lower, userId: null },
      data: { userId },
    }),
  ]);
}
