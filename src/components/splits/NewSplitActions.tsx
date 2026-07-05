"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Users } from "lucide-react";
import { Button, Input, FormError } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { splits } from "@/lib/client-api";

// Two entry points shown on the Splits hub: invite a friend, and create a group.
export function NewSplitActions() {
  const router = useRouter();
  const [mode, setMode] = useState<null | "friend" | "group">(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  function close() {
    setMode(null);
    setValue("");
    setError(undefined);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSaving(true);
    try {
      if (mode === "friend") await splits.inviteFriend(value.trim());
      else await splits.createGroup(value.trim());
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => setMode("friend")}>
          <UserPlus className="h-4 w-4" /> Add friend
        </Button>
        <Button variant="outline" onClick={() => setMode("group")}>
          <Users className="h-4 w-4" /> New group
        </Button>
      </div>

      <Modal
        open={mode !== null}
        onClose={close}
        title={mode === "friend" ? "Add a friend" : "New group"}
      >
        <form onSubmit={submit} className="space-y-4">
          <FormError>{error}</FormError>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === "friend" ? "friend@email.com" : "e.g. Goa Trip"}
            type={mode === "friend" ? "email" : "text"}
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : mode === "friend" ? "Send invite" : "Create group"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
