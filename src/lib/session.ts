import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Returns the signed-in user's id, or redirects to /login. Use in server components/actions.
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

// Returns the full user record (for settings, currency, salary), redirecting if not signed in.
export async function requireUser() {
  const id = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/login");
  return user;
}
