"use client";

import { useEffect, useState } from "react";
import { Copy, RefreshCw, Globe, Mail, Users, Trash2, Check } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Input, Select, Label, FormError } from "@/components/ui";
import {
  notesApi,
  type NoteCollaboratorItem,
  type NoteDetail,
} from "@/lib/client-api";

type Friend = { id: string; name: string | null; email: string };
type Role = "VIEWER" | "EDITOR";

// Owner-only sharing dialog: public link, email invite, and friend share, plus
// the current collaborator list. Fetches fresh note detail + friends on open.
export function ShareNoteModal({ noteId, onClose }: { noteId: string; onClose: () => void }) {
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [email, setEmail] = useState("");
  const [emailRole, setEmailRole] = useState<Role>("VIEWER");
  const [friendId, setFriendId] = useState("");
  const [friendRole, setFriendRole] = useState<Role>("VIEWER");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { note } = await notesApi.get(noteId);
    setNote(note);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { note } = await notesApi.get(noteId);
        if (alive) setNote(note);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => { if (alive) setFriends(d.friends ?? []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [noteId]);

  const publicUrl =
    note?.publicToken && typeof window !== "undefined"
      ? `${window.location.origin}/share/${note.publicToken}`
      : "";

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const collaborators = note?.collaborators ?? [];

  return (
    <Modal open onClose={onClose} title="Share note">
      <div className="space-y-5">
        {error && <FormError>{error}</FormError>}

        {/* Public link */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              <Globe className="h-4 w-4" /> Public link
            </span>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-500">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-600"
                checked={!!note?.isPublic}
                disabled={busy || !note}
                onChange={(e) =>
                  run(() => (e.target.checked ? notesApi.enablePublic(noteId) : notesApi.disablePublic(noteId)))
                }
              />
              {note?.isPublic ? "On" : "Off"}
            </label>
          </div>
          {note?.isPublic && (
            <div className="flex items-center gap-2">
              <Input readOnly value={publicUrl} className="h-9 text-xs" onFocus={(e) => e.currentTarget.select()} />
              <button onClick={copyLink} title="Copy" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
              <button onClick={() => run(() => notesApi.rotatePublic(noteId))} title="Reset link" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          )}
          <p className="text-xs text-slate-400">Anyone with the link can view (read-only). Reset invalidates the old link.</p>
        </section>

        {/* Invite by email */}
        <section className="space-y-2">
          <Label className="mb-0 flex items-center gap-2"><Mail className="h-4 w-4" /> Invite by email</Label>
          <div className="flex items-center gap-2">
            <Input type="email" placeholder="name@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
            <Select value={emailRole} onChange={(e) => setEmailRole(e.target.value as Role)} className="h-9 w-28">
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
            </Select>
            <Button
              className="h-9 px-3"
              disabled={busy || !email}
              onClick={() => run(async () => { await notesApi.addCollaborator(noteId, { email, role: emailRole }); setEmail(""); })}
            >
              Invite
            </Button>
          </div>
        </section>

        {/* Share with a friend */}
        {friends.length > 0 && (
          <section className="space-y-2">
            <Label className="mb-0 flex items-center gap-2"><Users className="h-4 w-4" /> Share with a friend</Label>
            <div className="flex items-center gap-2">
              <Select value={friendId} onChange={(e) => setFriendId(e.target.value)} className="h-9">
                <option value="">Choose a friend…</option>
                {friends.map((f) => <option key={f.id} value={f.id}>{f.name ?? f.email}</option>)}
              </Select>
              <Select value={friendRole} onChange={(e) => setFriendRole(e.target.value as Role)} className="h-9 w-28">
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
              </Select>
              <Button
                className="h-9 px-3"
                disabled={busy || !friendId}
                onClick={() => run(async () => { await notesApi.addCollaborator(noteId, { friendId, role: friendRole }); setFriendId(""); })}
              >
                Share
              </Button>
            </div>
          </section>
        )}

        {/* Current collaborators */}
        {collaborators.length > 0 && (
          <section className="space-y-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">People with access</p>
            {collaborators.map((c) => (
              <CollaboratorRow key={c.id} noteId={noteId} c={c} busy={busy} onChanged={refresh} onError={setError} />
            ))}
          </section>
        )}
      </div>
    </Modal>
  );
}

function CollaboratorRow({
  noteId, c, busy, onChanged, onError,
}: {
  noteId: string;
  c: NoteCollaboratorItem;
  busy: boolean;
  onChanged: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [working, setWorking] = useState(false);
  async function act(fn: () => Promise<unknown>) {
    setWorking(true);
    try { await fn(); await onChanged(); }
    catch (e) { onError(e instanceof Error ? e.message : "Failed"); }
    finally { setWorking(false); }
  }
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-700 dark:text-slate-200">{c.email}</p>
        <p className="text-xs text-slate-400">{c.status === "PENDING" ? "Invited" : c.status === "ACCEPTED" ? "Active" : "Declined"}</p>
      </div>
      <div className="flex items-center gap-1">
        <Select
          value={c.role}
          disabled={busy || working}
          className="h-8 w-24 text-xs"
          onChange={(e) => act(() => notesApi.updateCollaborator(noteId, c.id, e.target.value as Role))}
        >
          <option value="VIEWER">Viewer</option>
          <option value="EDITOR">Editor</option>
        </Select>
        <button
          onClick={() => act(() => notesApi.removeCollaborator(noteId, c.id))}
          disabled={busy || working}
          title="Remove"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-700"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
