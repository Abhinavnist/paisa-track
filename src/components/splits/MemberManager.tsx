"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { Button, Input, FormError } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { splits } from "@/lib/client-api";

export type MemberRow = {
  id: string; // GroupMember id
  userId: string | null;
  name: string | null;
  email: string;
  isAdmin: boolean;
  pending: boolean;
};

// Group member list with admin-only invite + remove.
export function MemberManager({
  groupId,
  members,
  meId,
  isAdmin,
}: {
  groupId: string;
  members: MemberRow[];
  meId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSaving(true);
    try {
      await splits.inviteMember(groupId, email.trim());
      setEmail("");
      setInviteOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function remove(memberId: string) {
    setBusy(memberId);
    try {
      await splits.removeMember(groupId, memberId);
      router.refresh();
    } catch (err) {
      // If blocked by an outstanding balance, offer to force-remove.
      const msg = err instanceof Error ? err.message : "Failed";
      if (msg.includes("balance") && confirm(`${msg}. Remove anyway?`)) {
        try {
          await splits.removeMember(groupId, memberId, true);
          router.refresh();
          return;
        } catch {
          /* fall through */
        }
      }
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500">Members</h2>
        {isAdmin && (
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1 text-sm font-medium text-emerald-600"
          >
            <UserPlus className="h-4 w-4" /> Invite
          </button>
        )}
      </div>

      <ul className="space-y-1.5">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700"
          >
            <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">
              {m.userId === meId ? "You" : m.name || m.email}
              {m.isAdmin && <span className="ml-1.5 text-xs text-slate-400">admin</span>}
              {m.pending && <span className="ml-1.5 text-xs text-amber-500">pending</span>}
            </span>
            {isAdmin && m.userId !== meId && (
              <button
                onClick={() => remove(m.id)}
                disabled={busy === m.id}
                className="text-slate-300 hover:text-red-500 disabled:opacity-50"
                aria-label="Remove member"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite member">
        <form onSubmit={invite} className="space-y-4">
          <FormError>{error}</FormError>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@email.com"
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Sending…" : "Send invite"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
