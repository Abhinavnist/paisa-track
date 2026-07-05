"use client";

import { useState } from "react";
import { Button, Input, Label, Select, FormError } from "@/components/ui";
import { splits, type SettlementInput } from "@/lib/client-api";
import type { Person } from "@/components/splits/AddSharedExpenseForm";

// Record a payment from one person to another to settle a debt.
export function SettleUpForm({
  people,
  meId,
  scope,
  initial,
  onSuccess,
}: {
  people: Person[];
  meId: string;
  scope: { groupId: string } | { friendId: string };
  initial?: { fromId?: string; toId?: string; amount?: number };
  onSuccess: () => void;
}) {
  const other = people.find((p) => p.id !== meId);
  const [fromId, setFromId] = useState(initial?.fromId ?? meId);
  const [toId, setToId] = useState(initial?.toId ?? other?.id ?? meId);
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  function label(p: Person) {
    return p.id === meId ? "You" : p.name || p.email;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const value = Number(amount);
    if (!value || value <= 0) return setError("Enter an amount greater than 0");
    if (fromId === toId) return setError("Payer and receiver must differ");

    const body: SettlementInput = { ...scope, fromId, toId, amount: value, note: note.trim() || null };
    setSaving(true);
    try {
      await splits.createSettlement(body);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormError>{error}</FormError>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="from">From</Label>
          <Select id="from" value={fromId} onChange={(e) => setFromId(e.target.value)}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {label(p)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Select id="to" value={toId} onChange={(e) => setToId(e.target.value)}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {label(p)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="samt">Amount</Label>
        <Input
          id="samt"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          autoFocus
        />
      </div>
      <div>
        <Label htmlFor="snote">Note (optional)</Label>
        <Input id="snote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. UPI" />
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving…" : "Record payment"}
      </Button>
    </form>
  );
}
