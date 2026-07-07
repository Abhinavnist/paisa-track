"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, FileText, Pin, Users2, Archive, Trash2, Folder, Tag as TagIcon, X,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { NoteCard } from "@/components/notes/NoteCard";
import { cn } from "@/lib/utils";
import {
  notesApi,
  type NoteListItem,
  type NoteFolderItem,
  type NoteTagItem,
  type NoteInvite,
} from "@/lib/client-api";

type View = "all" | "pinned" | "shared" | "archived" | "trash";
type Filter =
  | { kind: "view"; view: View }
  | { kind: "folder"; id: string; name: string }
  | { kind: "tag"; id: string; name: string };

const VIEWS: { view: View; label: string; icon: typeof FileText }[] = [
  { view: "all", label: "All notes", icon: FileText },
  { view: "pinned", label: "Pinned", icon: Pin },
  { view: "shared", label: "Shared with me", icon: Users2 },
  { view: "archived", label: "Archived", icon: Archive },
  { view: "trash", label: "Trash", icon: Trash2 },
];

export function NotesHub({
  initialNotes,
  initialFolders,
  initialTags,
  initialInvites,
}: {
  initialNotes: NoteListItem[];
  initialFolders: NoteFolderItem[];
  initialTags: NoteTagItem[];
  initialInvites: NoteInvite[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>({ kind: "view", view: "all" });
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState(initialNotes);
  const [folders, setFolders] = useState(initialFolders);
  const [tags, setTags] = useState(initialTags);
  const [invites, setInvites] = useState<NoteInvite[]>(initialInvites);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const params: Record<string, string> = {};
    if (filter.kind === "view") params.view = filter.view;
    else if (filter.kind === "folder") { params.view = "all"; params.folderId = filter.id; }
    else { params.view = "all"; params.tagId = filter.id; }
    if (q.trim()) params.q = q.trim();
    const { notes } = await notesApi.list(params);
    setNotes(notes);
  }, [filter, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const refreshMeta = useCallback(async () => {
    const [f, t, inv] = await Promise.all([
      notesApi.listFolders(),
      notesApi.listTags(),
      notesApi.listInvites(),
    ]);
    setFolders(f.folders);
    setTags(t.tags);
    setInvites(inv.invites);
  }, []);

  async function newNote() {
    setCreating(true);
    try {
      const { note } = await notesApi.create({});
      router.push(`/notes/${note.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function addFolder() {
    const name = prompt("Folder name")?.trim();
    if (!name) return;
    try { await notesApi.createFolder(name); await refreshMeta(); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
  }
  async function addTag() {
    const name = prompt("Tag name")?.trim();
    if (!name) return;
    try { await notesApi.createTag(name); await refreshMeta(); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
  }

  async function respondInvite(id: string, action: "accept" | "decline") {
    await notesApi.respondInvite(id, action);
    await Promise.all([refreshMeta(), load()]);
  }

  const isTrash = filter.kind === "view" && filter.view === "trash";
  const title =
    filter.kind === "view" ? VIEWS.find((v) => v.view === filter.view)?.label
      : filter.kind === "folder" ? filter.name
      : `#${filter.name}`;

  const railItem = (active: boolean) =>
    cn(
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
      active
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700",
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notes</h1>
        <Button onClick={newNote} disabled={creating} className="h-9 px-3">
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes…" className="pl-9" />
      </div>

      {invites.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Note invites</p>
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                <b>{inv.note.owner.name ?? inv.note.owner.email}</b> shared “{inv.note.title || "Untitled"}” ({inv.role.toLowerCase()})
              </span>
              <span className="flex shrink-0 gap-1">
                <Button className="h-8 px-2" onClick={() => respondInvite(inv.id, "accept")}>Accept</Button>
                <Button variant="ghost" className="h-8 px-2" onClick={() => respondInvite(inv.id, "decline")}>Decline</Button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filter rail */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {VIEWS.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            onClick={() => setFilter({ kind: "view", view })}
            className={cn(railItem(filter.kind === "view" && filter.view === view), "shrink-0")}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        {/* Folders + tags sidebar */}
        <aside className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Folders</span>
              <button onClick={addFolder} className="text-slate-400 hover:text-emerald-600"><Plus className="h-4 w-4" /></button>
            </div>
            {folders.length === 0 && <p className="px-3 text-xs text-slate-400">None yet</p>}
            {folders.map((f) => (
              <div key={f.id} className="group flex items-center">
                <button
                  onClick={() => setFilter({ kind: "folder", id: f.id, name: f.name })}
                  className={cn(railItem(filter.kind === "folder" && filter.id === f.id), "w-full")}
                >
                  <Folder className="h-4 w-4" />
                  <span className="flex-1 truncate text-left">{f.name}</span>
                  <span className="text-xs text-slate-400">{f.count}</span>
                </button>
                <button
                  onClick={async () => { if (confirm(`Delete folder “${f.name}”? Notes are kept.`)) { await notesApi.deleteFolder(f.id); await refreshMeta(); } }}
                  className="ml-1 hidden text-slate-300 hover:text-red-500 group-hover:block"
                ><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tags</span>
              <button onClick={addTag} className="text-slate-400 hover:text-emerald-600"><Plus className="h-4 w-4" /></button>
            </div>
            {tags.length === 0 && <p className="px-3 text-xs text-slate-400">None yet</p>}
            {tags.map((t) => (
              <div key={t.id} className="group flex items-center">
                <button
                  onClick={() => setFilter({ kind: "tag", id: t.id, name: t.name })}
                  className={cn(railItem(filter.kind === "tag" && filter.id === t.id), "w-full")}
                >
                  <TagIcon className="h-4 w-4" style={{ color: t.color ?? undefined }} />
                  <span className="flex-1 truncate text-left">{t.name}</span>
                </button>
                <button
                  onClick={async () => { if (confirm(`Delete tag “${t.name}”?`)) { await notesApi.deleteTag(t.id); await refreshMeta(); } }}
                  className="ml-1 hidden text-slate-300 hover:text-red-500 group-hover:block"
                ><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </aside>

        {/* Notes grid */}
        <section>
          <p className="mb-2 text-sm font-medium text-slate-500">{title}</p>
          {notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400 dark:border-slate-700">
              No notes here yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {notes.map((n) => (
                <NoteCard key={n.id} note={n} trashed={isTrash} onChanged={load} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
