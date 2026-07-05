"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, HandCoins } from "lucide-react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { AddSharedExpenseForm, type Person } from "@/components/splits/AddSharedExpenseForm";
import { SettleUpForm } from "@/components/splits/SettleUpForm";

// "Add expense" and "Settle up" actions shared by friend and group detail pages.
export function DetailActions({
  people,
  meId,
  currency,
  scope,
  settleInitial,
}: {
  people: Person[];
  meId: string;
  currency: string;
  scope: { groupId: string } | { friendId: string };
  settleInitial?: { fromId?: string; toId?: string; amount?: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState<null | "expense" | "settle">(null);

  const done = () => {
    setOpen(null);
    router.refresh();
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => setOpen("expense")}>
          <Plus className="h-4 w-4" /> Add expense
        </Button>
        <Button variant="outline" onClick={() => setOpen("settle")}>
          <HandCoins className="h-4 w-4" /> Settle up
        </Button>
      </div>

      <Modal open={open === "expense"} onClose={() => setOpen(null)} title="Add shared expense">
        <AddSharedExpenseForm
          people={people}
          meId={meId}
          currency={currency}
          scope={scope}
          onSuccess={done}
        />
      </Modal>

      <Modal open={open === "settle"} onClose={() => setOpen(null)} title="Settle up">
        <SettleUpForm
          people={people}
          meId={meId}
          scope={scope}
          initial={settleInitial}
          onSuccess={done}
        />
      </Modal>
    </>
  );
}
