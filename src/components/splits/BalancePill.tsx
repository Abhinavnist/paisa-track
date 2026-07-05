import { formatMoney } from "@/lib/currency";

// Renders a signed balance: positive => you are owed (green), negative => you
// owe (red), zero => settled (muted). `amount` is in major units.
export function BalancePill({
  amount,
  currency,
  className = "",
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  const rounded = Math.round(amount * 100) / 100;
  if (rounded === 0) {
    return <span className={"text-sm font-medium text-slate-400 " + className}>settled up</span>;
  }
  const owed = rounded > 0;
  return (
    <span
      className={
        "text-sm font-semibold " +
        (owed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400") +
        " " +
        className
      }
    >
      {owed ? "owes you " : "you owe "}
      {formatMoney(Math.abs(rounded), currency)}
    </span>
  );
}
