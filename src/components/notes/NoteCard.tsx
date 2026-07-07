"use client";

import Link from "next/link";
import { Pin, Globe, Users2, RotateCcw } from "lucide-react";
import { notesApi, type NoteListItem } from "@/lib/client-api";

// A single note tile on the hub. In Trash view it shows a restore action instead
// of linking into the (soft-deleted) note.
export function NoteCard({
  note,
  trashed,
  onChanged,
}: {
  note: NoteListItem;
  trashed?: boolean;
  onChanged?: () => void;
}) {
  const body = (
    <>
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="line-clamp-1 font-semibold text-slate-900 dark:text-white">
          {note.title || "Untitled"}
        </h3>
        <div className="flex shrink-0 items-center gap-1 text-slate-400">
          {note.isPinned && <Pin className="h-3.5 w-3.5" />}
          {note.isPublic && <Globe className="h-3.5 w-3.5" />}
          {note.isShared && !note.isOwner && <Users2 className="h-3.5 w-3.5" />}
        </div>
      </div>
      <p className="line-clamp-3 min-h-[3rem] text-sm text-slate-500 dark:text-slate-400">
        {note.excerpt || "No content yet"}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {note.folder && (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            {note.folder.name}
          </span>
        )}
        {note.tags.map((t) => (
          <span key={t.id} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-slate-500 dark:text-slate-300" style={{ background: (t.color ?? "#64748b") + "22" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color ?? "#64748b" }} />
            {t.name}
          </span>
        ))}
      </div>
    </>
  );

  const shell =
    "block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800";

  if (trashed) {
    return (
      <div className={shell}>
        {body}
        <button
          onClick={async () => { await notesApi.restore(note.id); onChanged?.(); }}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          <RotateCcw className="h-4 w-4" /> Restore
        </button>
      </div>
    );
  }

  return (
    <Link href={`/notes/${note.id}`} className={shell}>
      {body}
    </Link>
  );
}
