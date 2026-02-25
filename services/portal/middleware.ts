export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Match all routes EXCEPT:
     * - /login (sign-in page)
     * - /api/* (all API endpoints — auth handled per-route if needed)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /public files
     * - /inotion/* (dashboard pages — public showcase)
     */
    "/((?!login|api/|inotion|_next/static|_next/image|favicon\\.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.ico).*)",
  ],
};
