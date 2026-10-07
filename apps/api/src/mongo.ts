import mongoose from "mongoose";
import type { Db } from "mongodb";
import { loadConfig } from "./config";

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
