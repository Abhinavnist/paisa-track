// Server helpers for the Notes feature. Pure/text utilities plus the public-note
// lookup used by the unauthenticated /share page. Route-level auth guards for
// notes live in api.ts (requireNoteAccess) next to the Splitwise guards.

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { NoteRole } from "@/generated/prisma";

// Access levels ranked low→high. "OWNER" is synthetic (not stored) — it's the
// note's owner and outranks any collaborator role.
const ROLE_RANK: Record<"OWNER" | NoteRole, number> = { VIEWER: 1, EDITOR: 2, OWNER: 3 };

// True when `role` grants at least `minRole` access. Pure — unit tested.
export function roleSatisfies(role: "OWNER" | NoteRole, minRole: NoteRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

// A minimal shape of a TipTap/ProseMirror JSON document node.
type ProseNode = {
  type?: string;
  text?: string;
  content?: ProseNode[];
};

// Walk a TipTap document JSON collecting its text, inserting a space/newline at
// block boundaries so words from adjacent blocks don't run together. Kept in
// sync with Note.plainText on every write for search + list excerpts.
export function extractPlainText(content: unknown): string {
  const parts: string[] = [];

  const walk = (node: ProseNode | null | undefined) => {
    if (!node || typeof node !== "object") return;
    if (typeof node.text === "string") parts.push(node.text);
    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child);
      // Block-level nodes end with a break so text stays word-separated.
      parts.push("\n");
    }
  };

  walk(content as ProseNode);
  return parts.join("").replace(/\n{2,}/g, "\n").replace(/[ \t]+/g, " ").trim();
}

// Short preview used in note cards.
export function excerpt(plainText: string, max = 160): string {
  const clean = plainText.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max).trimEnd() + "…" : clean;
}

// Opaque, URL-safe token for public share links. Regenerated on rotate.
export function newPublicToken(): string {
  return randomBytes(16).toString("base64url");
}

// Fetch a note by its public token WITHOUT any session. Returns null unless the
// note currently has public sharing enabled and is not trashed — so revoking
// (isPublic=false) or trashing a note immediately 404s its public URL.
export async function getPublicNote(token: string) {
  if (!token) return null;
  return prisma.note.findFirst({
    where: { publicToken: token, isPublic: true, deletedAt: null },
    select: {
      id: true,
      title: true,
      content: true,
      updatedAt: true,
      owner: { select: { name: true } },
    },
  });
}
