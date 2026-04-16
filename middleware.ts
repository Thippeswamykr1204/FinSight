import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, isAuthConfigured, verifySessionToken } from "@/lib/auth";

function withPathnameHeader(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return requestHeaders;
}

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/api/auth/");
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = withPathnameHeader(request);

  if (!isAuthConfigured()) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const authenticated = await verifySessionToken(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (pathname === "/login" && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isPublicPath(pathname) || authenticated) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
