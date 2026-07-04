import { Mail, User as UserIcon, Tags, Repeat, Palette } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { SettingsForm } from "@/components/SettingsForm";
import { CategoryManager } from "@/components/CategoryManager";
import { RecurringManager, type RuleView } from "@/components/RecurringManager";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function SettingsPage() {
  const user = await requireUser();
  const [categories, rulesRaw] = await Promise.all([
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true, monthlyBudget: true },
    }),
    prisma.recurringRule.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { category: { select: { name: true } } },
    }),
  ]);

  const rules: RuleView[] = rulesRaw.map((r) => ({
    id: r.id,
    amount: r.amount,
    type: r.type,
    categoryId: r.categoryId,
    categoryName: r.category?.name ?? null,
    note: r.note,
    frequency: r.frequency,
    dayOfMonth: r.dayOfMonth,
    weekday: r.weekday,
    active: r.active,
  }));

  const catLite = categories.map((c) => ({ id: c.id, name: c.name, color: c.color }));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h1>

      {/* Account summary */}
      <Card className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <UserIcon className="h-4 w-4 text-slate-400" />
          {user.name ?? "—"}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Mail className="h-4 w-4 text-slate-400" />
          {user.email}
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Palette className="h-5 w-5 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Appearance</h2>
        </div>
        <ThemeToggle />
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Income & budget</h2>
        <SettingsForm
          initial={{
            name: user.name ?? "",
            currency: user.currency,
            monthlySalary: user.monthlySalary,
            monthlyBudget: user.monthlyBudget,
            salaryCreditDay: user.salaryCreditDay,
          }}
        />
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Repeat className="h-5 w-5 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recurring transactions</h2>
        </div>
        <RecurringManager rules={rules} categories={catLite} currency={user.currency} />
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Tags className="h-5 w-5 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Categories & budgets</h2>
        </div>
        <CategoryManager categories={categories} currency={user.currency} />
      </Card>
    </div>
  );
}
