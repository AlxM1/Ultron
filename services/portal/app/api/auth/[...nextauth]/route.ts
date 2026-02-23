import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";

const issuerUrl = (process.env.OIDC_ISSUER_URL || "https://auth.00raiser.space/application/o/portal/")
  .replace(/\/+$/, "");

// Extract base (strip /application/o/portal)
const authentikBase = issuerUrl.replace(/\/application\/o\/[^/]+$/, "");

console.log("NextAuth Config:", {
  issuerUrl,
  authentikBase,
  wellKnown: `${issuerUrl}/.well-known/openid-configuration`,
  clientId: process.env.OIDC_CLIENT_ID,
  nodeEnv: process.env.NODE_ENV
});

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV !== "production",
  providers: [
    {
      id: "authentik",
      name: "Authentik",
      type: "oauth",
      wellKnown: `${issuerUrl}/.well-known/openid-configuration`,
      clientId: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      idToken: true,
      checks: ["pkce", "state"],
      // Override issuer validation since Authentik returns different issuer in well-known vs id_token
      issuer: authentikBase, // Use the base domain as issuer
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
