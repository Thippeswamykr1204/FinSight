import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/app" || path.startsWith("/app/")) {
    const url = request.nextUrl.clone();
    const match = path.match(/^\/app\/workspaces\/([^/]+)$/);
    url.pathname = match
      ? "/dashboard"
      : path === "/app"
        ? "/dashboard"
        : path.replace(/^\/app/, "");
    if (match) url.searchParams.set("workspace", match[1]);
    return NextResponse.redirect(url);
  }
  if (!path.startsWith("/api/")) {
    const nonce = btoa(crypto.randomUUID());
    const paymentSources = path === "/billing" ? " https://*.razorpay.com" : "";
    const policy = `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'${paymentSources}; frame-src 'self'${paymentSources}; img-src 'self' data: blob:${paymentSources}; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; connect-src 'self'${paymentSources}${process.env.NODE_ENV === "development" ? " ws: wss:" : ""}`;
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
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/app/:path*",
    "/sign-in",
    "/sign-up",
    "/auth/:path*",
    "/dashboard/:path*",
    "/transactions/:path*",
    "/budgets/:path*",
    "/goals/:path*",
    "/accounts/:path*",
    "/insights/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/workspaces/:path*",
    "/members/:path*",
    "/audit/:path*",
    "/security/:path*",
    "/invitations/:path*",
    "/recurring/:path*",
    "/billing/:path*",
    "/shared-reports/:path*",
  ],
};
