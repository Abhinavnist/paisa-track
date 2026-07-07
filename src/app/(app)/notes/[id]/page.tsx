import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requireNoteAccess } from "@/lib/api";
import { NoteWorkspace } from "@/components/notes/NoteWorkspace";
import type { NoteContent, NoteDetail } from "@/lib/client-api";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();

  const access = await requireNoteAccess(id, userId, "VIEWER");
  if ("response" in access) notFound();

  const isOwner = access.role === "OWNER";
  const canEdit = access.role === "OWNER" || access.role === "EDITOR";

  const [row, folders, tags] = await Promise.all([
    prisma.note.findUnique({
      where: { id },
      select: {
        id: true, title: true, content: true, folderId: true, isPinned: true,
        isArchived: true, isPublic: true, publicToken: true, updatedAt: true,
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
        collaborators: { select: { id: true, email: true, role: true, status: true, userId: true } },
      },
    }),
    isOwner
      ? prisma.noteFolder.findMany({ where: { ownerId: userId }, orderBy: { name: "asc" }, select: { id: true, name: true, _count: { select: { notes: { where: { deletedAt: null } } } } } })
      : Promise.resolve([]),
    isOwner
      ? prisma.noteTagLabel.findMany({ where: { ownerId: userId }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } })
      : Promise.resolve([]),
  ]);

  if (!row) notFound();

  const note: NoteDetail = {
    id: row.id,
    title: row.title,
    content: row.content as NoteContent,
    folderId: row.folderId,
    isPinned: row.isPinned,
    isArchived: row.isArchived,
    isPublic: row.isPublic,
    publicToken: row.publicToken,
    updatedAt: row.updatedAt.toISOString(),
    tags: row.tags.map((t) => t.tag),
    collaborators: row.collaborators,
  };

  return (
    <NoteWorkspace
      note={note}
      isOwner={isOwner}
      canEdit={canEdit}
      folders={folders.map((f) => ({ id: f.id, name: f.name, count: "_count" in f ? f._count.notes : 0 }))}
      allTags={tags}
    />
  );
}
