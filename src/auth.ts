import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authorizeSignIn, PROVIDER } from "@/lib/admin/admins";

declare module "next-auth" {
  interface Session {
    user: { subject?: string; email?: string | null; name?: string | null; image?: string | null };
  }
}

/**
 * Admin authentication. Google proves identity; authorizeSignIn decides
 * access against waitlist.admin_users. There is no signup flow.
 *
 * Env: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET,
 * ADMIN_BOOTSTRAP_EMAIL_1..3 (legacy ADMIN_BOOTSTRAP_EMAIL fallback).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/admin/login", error: "/admin/login" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== PROVIDER || !account.providerAccountId) return false;
      const decision = await authorizeSignIn({
        subject: account.providerAccountId,
        email: typeof profile?.email === "string" ? profile.email : "",
        emailVerified: profile?.email_verified === true,
      });
      return decision.kind === "deny" ? "/admin/login?denied=1" : true;
    },
    jwt({ token, account }) {
      if (account) token.providerSubject = account.providerAccountId;
      return token;
    },
    session({ session, token }) {
      session.user.subject = typeof token.providerSubject === "string" ? token.providerSubject : undefined;
      return session;
    },
  },
});
