import { Wallet } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
          <Wallet className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">PaisaTrack</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Know where your money goes.</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
