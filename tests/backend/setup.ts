import { afterAll, afterEach, beforeAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { connectMongo, disconnectMongo } from "@/backend/db/mongo";

let mongoReplSet: MongoMemoryReplSet;

beforeAll(async () => {
  mongoReplSet = await MongoMemoryReplSet.create({
    binary: {
      version: "7.0.14",
    },
    replSet: {
      count: 1,
      storageEngine: "wiredTiger",
    },
  });

  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = "test";
  env.BACKEND_HOST = "127.0.0.1";
  env.BACKEND_PORT = "4000";
  env.MONGODB_URI = mongoReplSet.getUri();
  env.MONGODB_DB_NAME = "freeCodeCamp_test";
  env.JWT_SECRET = "test-jwt-secret";
  env.FRONTEND_URL = "http://localhost:3000";
  env.ADMIN_JWT_EXPIRES_IN = "12h";

  env.PAYSTACK_SECRET_KEY = "sk_test_mock";
  env.PAYSTACK_WEBHOOK_SECRET = "whsec_test_mock";
  env.PAYSTACK_PUBLIC_KEY = "pk_test_mock";

  env.TRADEFAIR_HOLD_MINUTES = "20";
  env.TRADEFAIR_EVENT_SLUG = "iuo-2026-tradefair";
  env.TRADEFAIR_FRONTEND_URL = "http://localhost:3000";
  env.TRADEFAIR_CONFIRMATION_URL =
    "http://localhost:3000/tradefair/confirmation";
  env.TRADEFAIR_CALLBACK_URL =
    "http://localhost:4000/api/tradefair/payments/callback";
  env.WHATSAPP_SUPPORT_NUMBER = "2349049363602";

  await connectMongo();
});

afterEach(async () => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await disconnectMongo();
  if (mongoReplSet) {
    await mongoReplSet.stop();
  }
});
