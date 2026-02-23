export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Match all routes EXCEPT:
     * - /login (sign-in page)
     * - /api/auth/* (NextAuth endpoints)
     * - /api/health-check (Docker healthcheck)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /public files
     */
    "/((?!login|api/auth|api/health-check|_next/static|_next/image|favicon\\.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.ico).*)",
  ],
};
