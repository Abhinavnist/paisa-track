import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { friendNetMinor } from "@/lib/balances";
import { orderedPair, toMajor } from "@/lib/splits";
import { Card } from "@/components/ui";
import { BalancePill } from "@/components/splits/BalancePill";
import { DetailActions } from "@/components/splits/DetailActions";
import { ExpenseFeed } from "@/components/splits/ExpenseFeed";
import type { Person } from "@/components/splits/AddSharedExpenseForm";

export default async function FriendDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id: friendId } = await params;

  const [userAId, userBId] = orderedPair(me.id, friendId);
  const friendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { id: true },
  });
  if (!friendship) notFound();

  const friend = await prisma.user.findUnique({
    where: { id: friendId },
    select: { id: true, name: true, email: true },
  });
  if (!friend) notFound();

  const pair = [me.id, friendId];
  const all = await prisma.sharedExpense.findMany({
    where: { groupId: null, deletedAt: null, paidById: { in: pair } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      shares: { select: { userId: true } },
      paidBy: { select: { id: true, name: true, email: true } },
    },
  });
  const expenses = all
    .filter((e) => e.shares.every((s) => pair.includes(s.userId)))
    .map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      date: e.date.toISOString(),
      paidBy: e.paidBy,
    }));

  const net = toMajor(await friendNetMinor(me.id, friendId));
  const people: Person[] = [
    { id: me.id, name: me.name, email: me.email },
    { id: friend.id, name: friend.name, email: friend.email },
  ];
  const settleInitial =
    net > 0
      ? { fromId: friend.id, toId: me.id, amount: net }
      : net < 0
        ? { fromId: me.id, toId: friend.id, amount: -net }
        : undefined;

  return (
    <div className="space-y-6">
      <Link href="/splits" className="inline-flex items-center gap-1 text-sm text-slate-500">
        <ChevronLeft className="h-4 w-4" /> Splits
      </Link>

      <Card className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500 dark:bg-slate-700">
          {(friend.name || friend.email).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-slate-900 dark:text-white">
            {friend.name || friend.email}
          </p>
          <BalancePill amount={net} currency={me.currency} />
        </div>
      </Card>

      <DetailActions
        people={people}
        meId={me.id}
        currency={me.currency}
        scope={{ friendId }}
        settleInitial={settleInitial}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500">Expenses</h2>
        <ExpenseFeed expenses={expenses} meId={me.id} currency={me.currency} />
      </section>
    </div>
  );
}
