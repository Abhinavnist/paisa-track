import { Mail, User as UserIcon, Tags } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { SettingsForm } from "@/components/SettingsForm";
import { CategoryManager } from "@/components/CategoryManager";

export default async function SettingsPage() {
  const user = await requireUser();
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Settings</h1>

      {/* Account summary */}
      <Card className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <UserIcon className="h-4 w-4 text-slate-400" />
          {user.name ?? "—"}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Mail className="h-4 w-4 text-slate-400" />
          {user.email}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Income & budget</h2>
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
          <Tags className="h-5 w-5 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-800">Categories</h2>
        </div>
        <CategoryManager categories={categories} />
      </Card>
    </div>
  );
}
