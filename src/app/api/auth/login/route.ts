import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createSessionToken, getSessionCookieOptions, isAuthConfigured } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    if (!isAuthConfigured()) {
      return apiError("Set APP_PASSWORD to enable authentication", 400);
    }

    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";

    if (!password || password !== process.env.APP_PASSWORD) {
      return apiError("Invalid password", 401);
    }

    const token = await createSessionToken();
    const response = NextResponse.json({ success: true, data: { authenticated: true } }, { status: 200 });
    response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[AUTH_LOGIN_POST]", error);
    return apiError("Failed to sign in", 500);
  }
}
