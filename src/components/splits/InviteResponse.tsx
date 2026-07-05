"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { splits } from "@/lib/client-api";

// Accept / decline buttons for a pending friend or group invite.
export function InviteResponse({ kind, id }: { kind: "friend" | "group"; id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function respond(action: "accept" | "decline") {
    setBusy(true);
    try {
      if (kind === "friend") await splits.respondFriendInvite(id, action);
      else await splits.respondGroupInvite(id, action);
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => respond("accept")}
        disabled={busy}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white disabled:opacity-50"
        aria-label="Accept"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onClick={() => respond("decline")}
        disabled={busy}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 disabled:opacity-50"
        aria-label="Decline"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
