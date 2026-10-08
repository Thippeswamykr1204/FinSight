import mongoose from "mongoose";
import type { Db } from "mongodb";
import { loadConfig } from "./config";
import "./models";

export function getDb() {
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB is not connected.");
  return database as unknown as Db;
}

export async function connectMongo() {
  await mongoose.connect(loadConfig().MONGODB_URI, {
    serverSelectionTimeoutMS: 5_000,
    maxPoolSize: 30,
  });
  await Promise.all(
    Object.values(mongoose.models).map((value) => value.init()),
  );
  await getDb()
    .collection("email_outbox")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await getDb()
    .collection("email_outbox")
    .createIndex({ sentAt: 1, expiresAt: 1 });
  await getDb().collection("users").createIndex({ email: 1 }, { unique: true });
  await getDb()
    .collection("sessions")
    .createIndex({ token: 1 }, { unique: true });
  await getDb()
    .collection("sessions")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await getDb()
    .collection("verifications")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return getDb();
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}

export function mongoReady() {
  return (
    mongoose.connection.readyState === 1 && Boolean(mongoose.connection.db)
  );
}
