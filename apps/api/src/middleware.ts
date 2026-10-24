/* eslint-disable @typescript-eslint/no-namespace */
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./http.js";
import { getRateLimiter } from "./limits.js";
import { User, RefreshSession, Membership } from "./models.js";
import {
  accessTokenFrom,
  csrfTokenFrom,
  decryptField,
  sameSecret,
  verifyAccessToken,
} from "./security.js";
import { loadConfig } from "./config.js";

export type Principal = {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
};

declare global {
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

export async function authenticate(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  try {
    const token = accessTokenFrom(request);
    if (!token)
      throw new HttpError(401, "UNAUTHENTICATED", "Sign in to continue.");
    const claims = await verifyAccessToken(token);
    const [user, session] = await Promise.all([
      User.findOne({ _id: claims.sub, deletedAt: null }).lean(),
      RefreshSession.findOne({
        _id: claims.sid,
        userId: claims.sub,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }).lean(),
    ]);
    if (!user || !session)
      throw new HttpError(
        401,
        "SESSION_EXPIRED",
        "Your session has expired. Sign in again.",
      );
    request.principal = {
      userId: String(user._id),
      sessionId: String(session._id),
      email: decryptField(user.emailCiphertext),
      name: user.name,
    };
    next();
  } catch (error) {
    next(
      error instanceof HttpError
        ? error
        : new HttpError(401, "UNAUTHENTICATED", "Sign in to continue."),
    );
  }
}

export function principal(request: Request) {
  if (!request.principal)
    throw new HttpError(401, "UNAUTHENTICATED", "Sign in to continue.");
  return request.principal;
}

export async function requireMembership(
  request: Request,
  workspaceId: string,
  permission: "read" | "write" | "owner" = "read",
) {
  const actor = principal(request);
  const membership = await Membership.findOne({
    workspaceId,
    userId: actor.userId,
  }).lean();
  if (!membership)
    throw new HttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
  if (permission === "write" && membership.role === "VIEWER")
    throw new HttpError(
      403,
      "FORBIDDEN",
      "You have read-only access to this workspace.",
    );
  if (permission === "owner" && membership.role !== "OWNER")
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only the workspace owner can do that.",
    );
  return membership;
}

export function checkOrigin(request: Request) {
  const origin = request.header("origin");
  if (!origin) return;
  if (origin !== loadConfig().WEB_ORIGIN)
    throw new HttpError(
      403,
      "ORIGIN_BLOCKED",
      "This request origin is not allowed.",
    );
}

export function requireCsrf(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  try {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next();
    checkOrigin(request);
    if (request.path.startsWith("/api/auth/")) return next();
    const header = request.header("x-csrf-token");
    if (!sameSecret(header, csrfTokenFrom(request)))
      throw new HttpError(
        403,
        "CSRF_BLOCKED",
        "Refresh the page and try again.",
      );
    return next();
  } catch (error) {
    return next(error);
  }
}

export function rateLimit(
  max: number,
  windowSeconds: number,
  key: (request: Request) => string,
) {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await getRateLimiter().consume(
        key(request),
        max,
        windowSeconds,
      );
      response.setHeader("X-RateLimit-Remaining", result.remaining);
      if (!result.allowed) {
        response.setHeader("Retry-After", result.retryAfter);
        throw new HttpError(
          429,
          "RATE_LIMITED",
          "Too many attempts. Try again shortly.",
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
