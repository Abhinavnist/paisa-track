import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api";

// GET /api/notes/invites — pending note shares addressed to me.
export async function GET() {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const invites = await prisma.noteCollaborator.findMany({
    where: { userId: authResult.userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      role: true,
      note: {
        select: { id: true, title: true, owner: { select: { name: true, email: true } } },
      },
    },
  });
  return NextResponse.json({ invites });
}
