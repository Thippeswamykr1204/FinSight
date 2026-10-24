import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { HttpError } from "./http.js";
import { RefreshSession } from "./models.js";
import {
  clearAuthCookies,
  hashRefreshToken,
  issueAccessToken,
  newOpaqueToken,
  refreshTokenFrom,
  setAuthCookies,
} from "./security.js";
import type { Principal } from "./middleware.js";
import { authenticateUser, createUser } from "./services.js";

export async function establishSession(
  user: { id: string; email: string; name: string },
  request: Request,
  response: Response,
) {
  const refreshToken = newOpaqueToken();
  const sessionId = randomUUID();
  const familyId = randomUUID();
  await RefreshSession.create({
    _id: sessionId,
    userId: user.id,
    familyId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: request.header("user-agent")?.slice(0, 300) ?? "",
  });
  setAuthCookies(
    response,
    await issueAccessToken(user.id, sessionId),
    refreshToken,
  );
  return { user: { id: user.id, email: user.email, name: user.name } };
}

export async function register(
  input: {
    name: string;
    email: string;
    password: string;
    privacyAccepted: boolean;
  },
  requestId: string,
  request: Request,
  response: Response,
) {
  const user = await createUser(input, requestId);
  return establishSession(user, request, response);
}

export async function login(
  email: string,
  password: string,
  request: Request,
  response: Response,
) {
  const user = await authenticateUser(email, password);
  return establishSession(user, request, response);
}

export async function rotate(request: Request, response: Response) {
  const raw = refreshTokenFrom(request);
  if (!raw)
    throw new HttpError(
      401,
      "SESSION_EXPIRED",
      "Your session has expired. Sign in again.",
    );
  const existing = await RefreshSession.findOne({
    tokenHash: hashRefreshToken(raw),
  });
  if (!existing)
    throw new HttpError(
      401,
      "SESSION_EXPIRED",
      "Your session has expired. Sign in again.",
    );
  if (existing.revokedAt) {
    await RefreshSession.updateMany(
      { familyId: existing.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    clearAuthCookies(response);
    throw new HttpError(
      401,
      "SESSION_REUSE",
      "This session was revoked. Sign in again.",
    );
  }
  if (existing.expiresAt <= new Date()) {
    clearAuthCookies(response);
    throw new HttpError(
      401,
      "SESSION_EXPIRED",
      "Your session has expired. Sign in again.",
    );
  }
  const nextToken = newOpaqueToken();
  const nextId = randomUUID();
  existing.revokedAt = new Date();
  existing.replacedBy = nextId;
  await existing.save();
  await RefreshSession.create({
    _id: nextId,
    userId: existing.userId,
    familyId: existing.familyId,
    tokenHash: hashRefreshToken(nextToken),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: request.header("user-agent")?.slice(0, 300) ?? "",
  });
  const user = await authenticateUserById(existing.userId);
  setAuthCookies(response, await issueAccessToken(user.id, nextId), nextToken);
  return { user };
}

async function authenticateUserById(id: string) {
  const { User } = await import("./models.js");
  const { decryptField } = await import("./security.js");
  const user = await User.findOne({ _id: id, deletedAt: null }).lean();
  if (!user)
    throw new HttpError(
      401,
      "SESSION_EXPIRED",
      "Your account is no longer available.",
    );
  return {
    id: String(user._id),
    email: decryptField(user.emailCiphertext),
    name: user.name,
  };
}

export async function logout(actor: Principal, response: Response) {
  await RefreshSession.updateOne(
    { _id: actor.sessionId, userId: actor.userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  clearAuthCookies(response);
  return { loggedOut: true };
}
