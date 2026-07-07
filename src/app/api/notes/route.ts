import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest } from "@/lib/api";
import { createNoteSchema } from "@/lib/validation";
import { extractPlainText, excerpt } from "@/lib/notes";
import type { Prisma } from "@/generated/prisma";

// Fields returned for list cards (no full content — keeps the payload small).
const listSelect = {
  id: true,
  title: true,
  plainText: true,
  isPinned: true,
  isArchived: true,
  deletedAt: true,
  isPublic: true,
  updatedAt: true,
  ownerId: true,
  folder: { select: { id: true, name: true } },
  tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
  _count: { select: { collaborators: true } },
} satisfies Prisma.NoteSelect;

type View = "all" | "pinned" | "shared" | "archived" | "trash";

// GET /api/notes?view=&q=&folderId=&tagId=
export async function GET(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { userId } = authResult;

  const sp = req.nextUrl.searchParams;
  const view = (sp.get("view") ?? "all") as View;
  const q = sp.get("q")?.trim();
  const folderId = sp.get("folderId");
  const tagId = sp.get("tagId");

  let where: Prisma.NoteWhereInput;
  if (view === "shared") {
    // Notes shared with me (I'm an accepted collaborator, not the owner).
    where = {
      deletedAt: null,
      ownerId: { not: userId },
      collaborators: { some: { userId, status: "ACCEPTED" } },
    };
  } else if (view === "trash") {
    where = { ownerId: userId, deletedAt: { not: null } };
  } else {
    where = { ownerId: userId, deletedAt: null, isArchived: view === "archived" ? true : false };
    if (view === "pinned") where.isPinned = true;
  }

  if (folderId) where.folderId = folderId;
  if (tagId) where.tags = { some: { tagId } };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { plainText: { contains: q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.note.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: 500,
    select: listSelect,
  });

  const notes = rows.map(({ plainText, tags, _count, ownerId, ...n }) => ({
    ...n,
    excerpt: excerpt(plainText),
    tags: tags.map((t) => t.tag),
    isShared: n.isPublic || _count.collaborators > 0,
    isOwner: ownerId === userId,
  }));

  return NextResponse.json({ notes });
}

// POST /api/notes
export async function POST(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { userId } = authResult;

  const body = await req.json().catch(() => null);
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
  const { title, content, folderId } = parsed.data;

  // A given folder must belong to the caller.
  if (folderId) {
    const owned = await prisma.noteFolder.findFirst({
      where: { id: folderId, ownerId: userId },
      select: { id: true },
    });
    if (!owned) return badRequest("Folder not found");
  }

  const note = await prisma.note.create({
    data: {
      ownerId: userId,
      title: title ?? "",
      content: (content ?? {}) as Prisma.InputJsonValue,
      plainText: content ? extractPlainText(content) : "",
      folderId: folderId ?? null,
    },
  });

  return NextResponse.json({ note }, { status: 201 });
}
