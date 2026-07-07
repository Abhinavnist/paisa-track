import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { excerpt } from "@/lib/notes";
import { NotesHub } from "@/components/notes/NotesHub";
import type { NoteListItem } from "@/lib/client-api";

// Server-prefetches the default "All notes" view plus folders/tags so the hub
// renders without a flash; the client then refetches on filter/search changes.
export default async function NotesPage() {
  const userId = await requireUserId();

  const [rows, folders, tags, inviteRows] = await Promise.all([
    prisma.note.findMany({
      where: { ownerId: userId, deletedAt: null, isArchived: false },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      take: 500,
      select: {
        id: true, title: true, plainText: true, isPinned: true, isArchived: true,
        isPublic: true, updatedAt: true, ownerId: true,
        folder: { select: { id: true, name: true } },
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
        _count: { select: { collaborators: true } },
      },
    }),
    prisma.noteFolder.findMany({
      where: { ownerId: userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { notes: { where: { deletedAt: null } } } } },
    }),
    prisma.noteTagLabel.findMany({
      where: { ownerId: userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.noteCollaborator.findMany({
      where: { userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, role: true,
        note: { select: { id: true, title: true, owner: { select: { name: true, email: true } } } },
      },
    }),
  ]);

  const initialNotes: NoteListItem[] = rows.map((n) => ({
    id: n.id,
    title: n.title,
    excerpt: excerpt(n.plainText),
    isPinned: n.isPinned,
    isArchived: n.isArchived,
    isPublic: n.isPublic,
    updatedAt: n.updatedAt.toISOString(),
    folder: n.folder,
    tags: n.tags.map((t) => t.tag),
    isShared: n.isPublic || n._count.collaborators > 0,
    isOwner: true,
  }));

  return (
    <NotesHub
      initialNotes={initialNotes}
      initialFolders={folders.map((f) => ({ id: f.id, name: f.name, count: f._count.notes }))}
      initialTags={tags}
      initialInvites={inviteRows}
    />
  );
}
