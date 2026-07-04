"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, FormError } from "@/components/ui";
import { CURRENCIES } from "@/lib/currency";
import { api } from "@/lib/client-api";

export type UserSettings = {
  name: string;
  currency: string;
  monthlySalary: number;
  monthlyBudget: number;
  salaryCreditDay: number;
};

export function SettingsForm({ initial }: { initial: UserSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSaving(true);
    try {
      await api.updateUser({
        name: form.name,
        currency: form.currency,
        monthlySalary: Number(form.monthlySalary) || 0,
        monthlyBudget: Number(form.monthlyBudget) || 0,
        salaryCreditDay: Number(form.salaryCreditDay) || 1,
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormError>{error}</FormError>

      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>

      <div>
        <Label htmlFor="currency">Currency</Label>
        <Select id="currency" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.label} ({c.code})
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="salary">Monthly salary</Label>
          <Input
            id="salary"
            inputMode="decimal"
            value={form.monthlySalary || ""}
            onChange={(e) => set("monthlySalary", Number(e.target.value))}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="budget">Monthly budget</Label>
          <Input
            id="budget"
            inputMode="decimal"
            value={form.monthlyBudget || ""}
            onChange={(e) => set("monthlyBudget", Number(e.target.value))}
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="creditDay">Salary credited on day (1–28)</Label>
        <Input
          id="creditDay"
          type="number"
          min={1}
          max={28}
          value={form.salaryCreditDay}
          onChange={(e) => set("salaryCreditDay", Number(e.target.value))}
        />
        <p className="mt-1 text-xs text-slate-400">
          Your salary is added automatically each month on this day.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {saved && <span className="text-sm font-medium text-emerald-600">Saved ✓</span>}
      </div>
    </form>
  );
}
