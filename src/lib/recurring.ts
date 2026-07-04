import { getISOWeek, getISOWeekYear, endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";

// Period keys used to guarantee a rule posts at most once per period (idempotent).
function monthlyPeriodKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function weeklyPeriodKey(d: Date) {
  return `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, "0")}`;
}

// Lazy processor: posts any due recurring rules for the current period, exactly once.
// Mirrors ensureSalaryCredited() — safe to call on every dashboard load.
export async function processRecurring(userId: string): Promise<void> {
  const rules = await prisma.recurringRule.findMany({
    where: { userId, active: true },
  });
  if (rules.length === 0) return;

  const now = new Date();

  for (const rule of rules) {
    if (rule.startDate > now) continue;
    if (rule.endDate && rule.endDate < now) continue;

    let periodKey: string;
    let due: boolean;
    let postDate: Date;

    if (rule.frequency === "MONTHLY") {
      periodKey = monthlyPeriodKey(now);
      const targetDay = Math.min(rule.dayOfMonth, endOfMonth(now).getDate());
      due = now.getDate() >= targetDay;
      postDate = new Date(now.getFullYear(), now.getMonth(), targetDay);
    } else {
      periodKey = weeklyPeriodKey(now);
      due = now.getDay() >= rule.weekday;
      postDate = now;
    }

    if (!due || rule.lastPostedPeriod === periodKey) continue;

    // Post the transaction and stamp the period together, so a retry can't double-post.
    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId,
          amount: rule.amount,
          type: rule.type,
          categoryId: rule.type === "EXPENSE" ? rule.categoryId : null,
          date: postDate,
          note: rule.note ?? "Recurring",
          source: "RECURRING",
        },
      }),
      prisma.recurringRule.update({
        where: { id: rule.id },
        data: { lastPostedPeriod: periodKey },
      }),
    ]);
  }
}
