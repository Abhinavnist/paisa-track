import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Returns the signed-in userId, or a 401 JSON response to short-circuit the handler.
export async function requireApiUser(): Promise<
  { userId: string } | { response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId: session.user.id };
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
