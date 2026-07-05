"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/auth";
import { signupSchema, loginSchema } from "@/lib/validation";
import { seedCategoriesForUser } from "@/lib/categories";
import { reconcileInvites } from "@/lib/social";

export type ActionState = { error?: string } | undefined;

// Register a new email/password user, seed their categories, then sign them in.
export async function registerUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    currency: formData.get("currency"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const { name, email, password, currency } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists. Try logging in." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, currency },
  });
  await seedCategoriesForUser(prisma, user.id);
  // Link any invites sent to this email before the account existed.
  await reconcileInvites(user.id, user.email);

  // Throws a redirect on success (do not wrap in try/catch).
  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  return undefined;
}

// Sign in an existing email/password user.
export async function authenticate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password" };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error; // re-throw redirect
  }
  return undefined;
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
