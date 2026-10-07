import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  isAuthConfigured,
  verifySessionToken,
} from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/api/")) {
    const nonce = btoa(crypto.randomUUID());
    const policy = `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; connect-src 'self'${process.env.NODE_ENV === "development" ? " ws: wss:" : ""}`;
    const headers = new Headers(request.headers);
    // Next reads the request CSP to attach this nonce to dynamic hydration scripts.
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", policy);
    const response = NextResponse.next({ request: { headers } });
    response.headers.set("Content-Security-Policy", policy);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  // Hosted handlers validate the real session and workspace on the Node server.
  if (path.startsWith("/api/identity/") || path.startsWith("/api/v1/"))
    return NextResponse.next();
  // The v2 browser demo has no access to the legacy single-user database API.
  if (
    !path.startsWith("/api/") ||
    path === "/api/health" ||
    path === "/api/ready"
  )
    return NextResponse.next();
  if (process.env.ENABLE_LEGACY_API !== "true")
    return NextResponse.json(
      {
        success: false,
        message:
          "The legacy database API is disabled. The demo stores data in this browser.",
      },
      { status: 503 },
    );
  if (!isAuthConfigured())
    return NextResponse.json(
      { success: false, message: "Server authentication is not configured." },
      { status: 503 },
    );
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin !== request.nextUrl.origin)
      return NextResponse.json(
        { success: false, message: "Same-origin request required." },
        { status: 403 },
      );
  }
  if (path === "/api/auth/login") return NextResponse.next();
  if (!(await verifySessionToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)))
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/app/:path*",
    "/sign-in",
    "/sign-up",
    "/auth/:path*",
  ],
};
