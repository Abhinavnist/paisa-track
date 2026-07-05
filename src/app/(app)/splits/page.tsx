import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { friendNetMinor, groupNetBalances } from "@/lib/balances";
import { toMajor } from "@/lib/splits";
import { formatMoney } from "@/lib/currency";
import { Card } from "@/components/ui";
import { BalancePill } from "@/components/splits/BalancePill";
import { NewSplitActions } from "@/components/splits/NewSplitActions";
import { InviteResponse } from "@/components/splits/InviteResponse";

export default async function SplitsPage() {
  const me = await requireUser();
  const meId = me.id;

  const [friendships, memberships, friendInvites, groupInvites] = await Promise.all([
    prisma.friendship.findMany({
      where: { OR: [{ userAId: meId }, { userBId: meId }] },
      include: {
        userA: { select: { id: true, name: true, email: true } },
        userB: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.groupMember.findMany({
      where: { userId: meId, status: "ACTIVE", invite: "ACCEPTED" },
      include: { group: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.friendInvite.findMany({
      where: { inviteeId: meId, status: "PENDING" },
      include: { inviter: { select: { name: true, email: true } } },
    }),
    prisma.groupMember.findMany({
      where: { userId: meId, status: "ACTIVE", invite: "PENDING" },
      include: { group: { select: { name: true } } },
    }),
  ]);

  const friends = await Promise.all(
    friendships.map(async (f) => {
      const friend = f.userAId === meId ? f.userB : f.userA;
      return { ...friend, balance: toMajor(await friendNetMinor(meId, friend.id)) };
    }),
  );

  const groups = await Promise.all(
    memberships.map(async (m) => ({
      id: m.group.id,
      name: m.group.name,
      balance: toMajor((await groupNetBalances(m.group.id)).get(meId) ?? 0),
    })),
  );

  const overall = [...friends, ...groups].reduce((s, x) => s + x.balance, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Splits</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overall you are{" "}
          {overall >= 0 ? "owed " : "in debt "}
          <span className={overall >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
            {formatMoney(Math.abs(Math.round(overall * 100) / 100), me.currency)}
          </span>
        </p>
      </div>

      <NewSplitActions />

      {/* Pending invitations */}
      {(friendInvites.length > 0 || groupInvites.length > 0) && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500">Invitations</h2>
          {friendInvites.map((inv) => (
            <Card key={inv.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {inv.inviter.name || inv.inviter.email}
                </p>
                <p className="text-xs text-slate-400">wants to be friends</p>
              </div>
              <InviteResponse kind="friend" id={inv.id} />
            </Card>
          ))}
          {groupInvites.map((inv) => (
            <Card key={inv.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {inv.group.name}
                </p>
                <p className="text-xs text-slate-400">group invitation</p>
              </div>
              <InviteResponse kind="group" id={inv.id} />
            </Card>
          ))}
        </section>
      )}

      {/* Groups */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500">Groups</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-slate-400">No groups yet.</p>
        ) : (
          groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`}>
              <Card className="flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{g.name}</p>
                  <BalancePill amount={g.balance} currency={me.currency} />
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Card>
            </Link>
          ))
        )}
      </section>

      {/* Friends */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500">Friends</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-slate-400">No friends yet. Add one above.</p>
        ) : (
          friends.map((f) => (
            <Link key={f.id} href={`/splits/friends/${f.id}`}>
              <Card className="flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700">
                  {(f.name || f.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {f.name || f.email}
                  </p>
                  <BalancePill amount={f.balance} currency={me.currency} />
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
