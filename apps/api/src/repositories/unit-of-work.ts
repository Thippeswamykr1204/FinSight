import { AsyncLocalStorage } from "node:async_hooks";
import mongoose from "mongoose";
import type { ClientSession } from "mongodb";
import { getDb } from "../mongo";
import type { Principal } from "../principal";
import { HttpError } from "../http";
import { Membership, Workspace } from "../models";

mongoose.set("transactionAsyncLocalStorage", true);
const storage = new AsyncLocalStorage<ClientSession>();
export const nativeOptions = () => ({ session: storage.getStore() });
export async function atomic<T>(operation: () => Promise<T>): Promise<T> {
  return mongoose.connection.transaction(
    (session) => storage.run(session as unknown as ClientSession, operation),
    {
      readPreference: "primary",
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    },
  );
}
export type Permission = "read" | "write" | "members" | "owner";
export async function membership(
  actor: Principal,
  workspaceId: string,
  permission: Permission = "read",
) {
  const member = await Membership.findOne({
    workspaceId,
    userId: actor.userId,
  }).lean();
  if (!member)
    throw new HttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
  const allowed =
    permission === "read" ||
    (permission === "write" && member.role !== "VIEWER") ||
    (permission === "members" && ["OWNER", "ADMIN"].includes(member.role)) ||
    (permission === "owner" && member.role === "OWNER");
  if (!allowed)
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Your workspace role does not allow this action.",
    );
  return member;
}
export async function workspaceWrite<T>(
  actor: Principal,
  workspaceId: string,
  permission: Permission,
  operation: () => Promise<T>,
) {
  return atomic(async () => {
    const workspace = await Workspace.findOneAndUpdate(
      { _id: workspaceId },
      { $inc: { revision: 1 } },
      { new: true },
    ).lean();
    if (!workspace)
      throw new HttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
    // Recheck both session and permission inside the serialized workspace write.
    const session = await getDb()
      .collection("sessions")
      .findOne(
        {
          _id: actor.sessionId as never,
          userId: actor.userId,
          expiresAt: { $gt: new Date() },
        },
        nativeOptions(),
      );
    if (!session) throw new HttpError(401, "SESSION_REVOKED", "Sign in again.");
    await membership(actor, workspaceId, permission);
    return operation();
  });
}
