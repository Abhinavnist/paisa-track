import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next.js "proxy" (formerly middleware): route protection via the `authorized` callback.
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  // Run on everything except static assets and the auth API routes.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons).*)"],
};
