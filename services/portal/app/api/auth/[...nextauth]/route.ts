import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";

// External URL (user-facing browser redirects) — env var or fallback
const authentikExternal = (process.env.AUTHENTIK_EXTERNAL_URL || "https://auth.00raiser.space").replace(/\/+$/, "");
// Internal URL (server-side fetches from within Docker network)
const authentikInternal = (process.env.AUTHENTIK_INTERNAL_URL || "http://raiser-authentik-server:9000").replace(/\/+$/, "");

if (process.env.NODE_ENV !== "production") {
  console.log("NextAuth Config:", {
    authentikExternal,
    authentikInternal,
    clientId: process.env.OIDC_CLIENT_ID,
    nodeEnv: process.env.NODE_ENV,
  });
}

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "authentik",
      name: "Authentik",
      type: "oauth",
      // authorization: external URL (user's browser will be redirected here)
      authorization: {
        url: `${authentikExternal}/application/o/authorize/`,
        params: { scope: "openid email profile" },
      },
      // token + userinfo: internal URLs (server-side, no hairpin NAT issues)
      token: `${authentikInternal}/application/o/token/`,
      userinfo: `${authentikInternal}/application/o/userinfo/`,
      clientId: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      // idToken: false — use userinfo endpoint instead of verifying JWT locally
      // (avoids needing JWKS URI / issuer discovery)
      idToken: false,
      checks: ["pkce", "state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.id = (profile as any)?.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
