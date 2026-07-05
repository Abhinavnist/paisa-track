import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { groupLedger } from "@/lib/balances";
import { netBalances, pairwiseBalances, toMajor } from "@/lib/splits";
import { formatMoney } from "@/lib/currency";
import { Card } from "@/components/ui";
import { BalancePill } from "@/components/splits/BalancePill";
import { DetailActions } from "@/components/splits/DetailActions";
import { ExpenseFeed } from "@/components/splits/ExpenseFeed";
import { MemberManager, type MemberRow } from "@/components/splits/MemberManager";
import type { Person } from "@/components/splits/AddSharedExpenseForm";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;

  const myMembership = await prisma.groupMember.findFirst({
    where: { groupId: id, userId: me.id, status: "ACTIVE", invite: "ACCEPTED" },
    select: { isAdmin: true },
  });
  if (!myMembership) notFound();

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
        include: { paidBy: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!group) notFound();

  const ledger = await groupLedger(id);
  const net = netBalances(ledger);
  const debts = pairwiseBalances(ledger);

  const activeMembers = group.members.filter((m) => m.status === "ACTIVE" && m.invite === "ACCEPTED");
  const people: Person[] = activeMembers
    .filter((m) => m.user)
    .map((m) => ({ id: m.user!.id, name: m.user!.name, email: m.user!.email }));

  const nameOf = (userId: string) => {
    if (userId === me.id) return "You";
    const m = group.members.find((x) => x.userId === userId);
    return m?.user?.name || m?.user?.email || "Someone";
  };

  const memberRows: MemberRow[] = group.members
    .filter((m) => m.status === "ACTIVE")
    .map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user?.name ?? null,
      email: m.email,
      isAdmin: m.isAdmin,
      pending: m.invite === "PENDING",
    }));

  const expenses = group.expenses.map((e) => ({
    id: e.id,
    description: e.description,
    amount: e.amount,
    date: e.date.toISOString(),
    paidBy: e.paidBy,
  }));

  return (
    <div className="space-y-6">
      <Link href="/splits" className="inline-flex items-center gap-1 text-sm text-slate-500">
        <ChevronLeft className="h-4 w-4" /> Splits
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{group.name}</h1>
        <BalancePill amount={toMajor(net.get(me.id) ?? 0)} currency={me.currency} />
      </div>

      <DetailActions people={people} meId={me.id} currency={me.currency} scope={{ groupId: id }} />

      {/* Simplified debts */}
      {debts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500">Who owes whom</h2>
          {debts.map((d, i) => (
            <Card key={i} className="flex items-center justify-between p-3 text-sm">
              <span className="text-slate-700 dark:text-slate-200">
                <span className="font-medium">{nameOf(d.fromId)}</span> →{" "}
                <span className="font-medium">{nameOf(d.toId)}</span>
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatMoney(toMajor(d.amountMinor), me.currency)}
              </span>
            </Card>
          ))}
        </section>
      )}

      <MemberManager groupId={id} members={memberRows} meId={me.id} isAdmin={myMembership.isAdmin} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500">Expenses</h2>
        <ExpenseFeed expenses={expenses} meId={me.id} currency={me.currency} />
      </section>
    </div>
  );
}
