import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  isAuthConfigured,
  verifySessionToken,
} from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // The v2 browser demo has no access to the legacy single-user database API.
  if (!path.startsWith("/api/") || path === "/api/health")
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

export const config = { matcher: ["/api/:path*"] };
