import { LogOut } from "lucide-react";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { signOutAction } from "@/app/actions/auth";
import { BottomNav } from "@/components/BottomNav";
import { AddTransactionFab } from "@/components/AddTransactionFab";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">PaisaTrack</span>
          <form action={signOutAction}>
            <button
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-28 pt-4">{children}</main>

      <AddTransactionFab categories={categories} />
      <BottomNav />
    </div>
  );
}
