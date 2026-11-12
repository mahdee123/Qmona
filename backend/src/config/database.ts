import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../lib/logger.js";

mongoose.set("strictQuery", true);

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15_000,
    maxPoolSize: 10,
  });
  logger.info("database connected", { database: mongoose.connection.name });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
