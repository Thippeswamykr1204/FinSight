import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { loadConfig } from "./config.js";

let memoryServer: MongoMemoryReplSet | undefined;

export async function connectDatabase() {
  const config = loadConfig();
  let uri = config.MONGODB_URI;
  if (!uri) {
    memoryServer = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    uri = memoryServer.getUri("finsight");
  }
  await mongoose.connect(uri, {
    maxPoolSize: config.NODE_ENV === "production" ? 20 : 5,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 10_000,
    connectTimeoutMS: 5_000,
  });
  return mongoose.connection;
}

export function databaseReady() {
  return mongoose.connection.readyState === 1;
}

export async function closeDatabase() {
  await mongoose.disconnect();
  await memoryServer?.stop();
  memoryServer = undefined;
}
