import mongoose from "mongoose";

import { getEnv } from "@/backend/config/env";

let isConnected = false;

export async function connectMongo(): Promise<typeof mongoose> {
  if (isConnected) {
    return mongoose;
  }

  const env = getEnv();
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
  });
  isConnected = true;
  return mongoose;
}

export async function disconnectMongo() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}
