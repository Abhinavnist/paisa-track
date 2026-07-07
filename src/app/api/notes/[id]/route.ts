import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest, forbidden, requireNoteAccess } from "@/lib/api";
import { updateNoteSchema } from "@/lib/validation";
import { extractPlainText } from "@/lib/notes";

type Params = { params: Promise<{ id: string }> };

const fullSelect = {
  id: true,
  title: true,
  content: true,
  folderId: true,
  isPinned: true,
  isArchived: true,
  isPublic: true,
  publicToken: true,
  ownerId: true,
  updatedAt: true,
  tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
  collaborators: {
    select: { id: true, email: true, role: true, status: true, userId: true },
  },
} as const;

// GET /api/notes/[id] — any collaborator (viewer+) or owner.
export async function GET(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  const access = await requireNoteAccess(id, authResult.userId, "VIEWER");
  if ("response" in access) return access.response;

  const note = await prisma.note.findUnique({ where: { id }, select: fullSelect });
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  const { tags, ownerId, ...rest } = note;
  return NextResponse.json({
    note: { ...rest, tags: tags.map((t) => t.tag) },
    role: access.role,
    isOwner: ownerId === authResult.userId,
  });
}

// PATCH /api/notes/[id] — content/title need EDITOR; organizational fields
// (folder, pin, archive, tags) are owner-only.
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { userId } = authResult;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
  const { title, content, folderId, isPinned, isArchived, tagIds } = parsed.data;

  const access = await requireNoteAccess(id, userId, "EDITOR");
  if ("response" in access) return access.response;

  const orgFields = { folderId, isPinned, isArchived, tagIds };
  const touchesOrg = Object.values(orgFields).some((v) => v !== undefined);
  if (touchesOrg && access.role !== "OWNER") {
    return forbidden("Only the owner can change folder, tags, pin, or archive");
  }

  // Validate owner-scoped references before writing.
  if (folderId) {
    const owned = await prisma.noteFolder.findFirst({
      where: { id: folderId, ownerId: userId },
      select: { id: true },
    });
    if (!owned) return badRequest("Folder not found");
  }
  if (tagIds && tagIds.length) {
    const count = await prisma.noteTagLabel.count({
      where: { id: { in: tagIds }, ownerId: userId },
    });
    if (count !== tagIds.length) return badRequest("Unknown tag");
  }

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (content !== undefined) {
    data.content = content;
    data.plainText = extractPlainText(content);
  }
  if (folderId !== undefined) data.folderId = folderId;
  if (isPinned !== undefined) data.isPinned = isPinned;
  if (isArchived !== undefined) data.isArchived = isArchived;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length) await tx.note.update({ where: { id }, data });
    if (tagIds !== undefined) {
      await tx.noteTag.deleteMany({ where: { noteId: id } });
      if (tagIds.length) {
        await tx.noteTag.createMany({
          data: tagIds.map((tagId) => ({ noteId: id, tagId })),
          skipDuplicates: true,
        });
      }
    }
  });

  const note = await prisma.note.findUnique({ where: { id }, select: fullSelect });
  const tags = note?.tags.map((t) => t.tag) ?? [];
  return NextResponse.json({ note: note && { ...note, tags } });
}

// DELETE /api/notes/[id] — soft delete to trash (owner only).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  const access = await requireNoteAccess(id, authResult.userId, "VIEWER");
  if ("response" in access) return access.response;
  if (access.role !== "OWNER") return forbidden("Only the owner can delete this note");

  await prisma.note.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
