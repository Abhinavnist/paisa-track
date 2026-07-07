import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe auth config shared by middleware and the full Node config.
// Contains ONLY things that work in the edge runtime (no Prisma, no bcrypt).

// Note: "/share/[token]" is intentionally NOT protected — public read-only note links.
const PROTECTED_PREFIXES = ["/dashboard", "/expenses", "/settings", "/notes"];

// Only enable Google when credentials are provided (keeps dev working without OAuth setup).
const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const authConfig = {
  pages: { signIn: "/login" },
  providers: googleEnabled
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isProtected = PROTECTED_PREFIXES.some((p) =>
        nextUrl.pathname.startsWith(p),
      );
      if (isProtected && !isLoggedIn) return false; // redirect to signIn page
      return true;
    },
  },
} satisfies NextAuthConfig;

export { googleEnabled };
