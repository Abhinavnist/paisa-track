"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft, Share2, Pin, PinOff, Archive, ArchiveRestore, Trash2, Check,
} from "lucide-react";
import { Button, Select } from "@/components/ui";
import { ShareNoteModal } from "@/components/notes/ShareNoteModal";
import { TagPicker } from "@/components/notes/TagPicker";
import { notesApi, type NoteContent, type NoteDetail, type NoteFolderItem, type NoteTagItem } from "@/lib/client-api";

// ssr:false is only valid inside a Client Component (Next.js 16) — this module
// is "use client", so the editor is code-split and never server-rendered.
const NoteEditor = dynamic(() => import("@/components/notes/NoteEditor"), {
  ssr: false,
  loading: () => <p className="py-10 text-center text-sm text-slate-400">Loading editor…</p>,
});

type SaveState = "idle" | "saving" | "saved";

export function NoteWorkspace({
  note,
  isOwner,
  canEdit,
  folders,
  allTags,
}: {
  note: NoteDetail;
  isOwner: boolean;
  canEdit: boolean;
  folders: NoteFolderItem[];
  allTags: NoteTagItem[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [folderId, setFolderId] = useState(note.folderId ?? "");
  const [tagIds, setTagIds] = useState(note.tags.map((t) => t.id));
  const [isPinned, setIsPinned] = useState(note.isPinned);
  const [isArchived, setIsArchived] = useState(note.isArchived);
  const [shareOpen, setShareOpen] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");

  const contentRef = useRef<NoteContent>(note.content);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave of title + content (the fields an editor can change).
  const scheduleSave = useCallback(() => {
    if (!canEdit) return;
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await notesApi.update(note.id, { title, content: contentRef.current });
        setSave("saved");
      } catch {
        setSave("idle");
      }
    }, 800);
  }, [canEdit, note.id, title]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Organizational changes (owner-only) save immediately.
  async function saveOrg(patch: Parameters<typeof notesApi.update>[1]) {
    try {
      await notesApi.update(note.id, patch);
      router.refresh();
    } catch {
      /* surfaced by disabled/again UX; keep it simple */
    }
  }

  async function togglePin() {
    const next = !isPinned;
    setIsPinned(next);
    await saveOrg({ isPinned: next });
  }
  async function toggleArchive() {
    const next = !isArchived;
    setIsArchived(next);
    await saveOrg({ isArchived: next });
  }
  async function trash() {
    if (!confirm("Move this note to Trash?")) return;
    await notesApi.remove(note.id);
    router.push("/notes");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/notes" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <ArrowLeft className="h-4 w-4" /> Notes
        </Link>
        <div className="flex items-center gap-2">
          {canEdit && (
            <span className="text-xs text-slate-400">
              {save === "saving" ? "Saving…" : save === "saved" ? (
                <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="h-3 w-3" /> Saved</span>
              ) : ""}
            </span>
          )}
          {isOwner && (
            <Button variant="outline" className="h-9 px-3" onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
          )}
        </div>
      </div>

      <input
        value={title}
        disabled={!canEdit}
        onChange={(e) => { setTitle(e.target.value); scheduleSave(); }}
        placeholder="Untitled"
        className="w-full bg-transparent text-2xl font-bold text-slate-900 outline-none placeholder:text-slate-300 disabled:opacity-100 dark:text-white dark:placeholder:text-slate-600"
      />

      {isOwner && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={folderId}
            className="h-9 w-auto"
            onChange={(e) => { setFolderId(e.target.value); saveOrg({ folderId: e.target.value || null }); }}
          >
            <option value="">No folder</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <TagPicker
            allTags={allTags}
            selected={tagIds}
            onChange={(ids) => { setTagIds(ids); saveOrg({ tagIds: ids }); }}
          />
          <div className="ml-auto flex items-center gap-1">
            <IconBtn title={isPinned ? "Unpin" : "Pin"} onClick={togglePin}>
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </IconBtn>
            <IconBtn title={isArchived ? "Unarchive" : "Archive"} onClick={toggleArchive}>
              {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            </IconBtn>
            <IconBtn title="Delete" onClick={trash} danger>
              <Trash2 className="h-4 w-4" />
            </IconBtn>
          </div>
        </div>
      )}

      <NoteEditor
        initialContent={note.content}
        editable={canEdit}
        onChange={(c) => { contentRef.current = c; scheduleSave(); }}
      />

      {isOwner && shareOpen && (
        <ShareNoteModal noteId={note.id} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}

function IconBtn({
  children, onClick, title, danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={
        "flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700" +
        (danger ? " hover:text-red-600" : "")
      }
    >
      {children}
    </button>
  );
}
