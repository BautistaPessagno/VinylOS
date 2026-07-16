import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import authRedirects from "@/lib/authRedirects";

const { buildLoginRedirectUrl } = authRedirects;

// UX-only redirect for a fast no-JS bounce. This is NOT the security boundary —
// every protected Server Component/Action still validates the real session
// (see lib/auth-session.ts) since proxy/middleware can be bypassed (CVE-2025-29927).
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(buildLoginRedirectUrl(request.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/collection/:path*",
    "/friends/:path*",
    "/users/:path*",
    "/wishlist/:path*",
    "/recommendations/:path*",
    "/album/:path*",
    "/artist/:path*",
    "/settings/:path*",
  ],
};
