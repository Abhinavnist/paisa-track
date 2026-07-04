"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/Modal";
import { TransactionForm, type CategoryLite } from "@/components/TransactionForm";

// Floating action button, fixed above the bottom nav, to add a transaction from anywhere.
export function AddTransactionFab({ categories }: { categories: CategoryLite[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 transition active:scale-95"
        aria-label="Add transaction"
      >
        <Plus className="h-7 w-7" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add transaction">
        <TransactionForm
          categories={categories}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}
