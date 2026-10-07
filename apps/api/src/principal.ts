import type { Request } from "express";
import { getAuth } from "./auth";
import { HttpError } from "./http";

export type Principal = {
  userId: string;
  email: string;
  name: string;
  sessionId: string;
  fresh: boolean;
};

export async function principal(request: Request): Promise<Principal> {
  const session = await getAuth().api.getSession({
    headers: new Headers(request.headers as Record<string, string>),
  });
  if (!session)
    throw new HttpError(
      401,
      "UNAUTHENTICATED",
      "Sign in to access your workspace.",
    );
  if (!session.user.emailVerified)
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Verify your email before continuing.",
    );
  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    sessionId: session.session.id,
    fresh:
      Date.now() - new Date(session.session.createdAt).getTime() <
      10 * 60 * 1000,
  };
}
