import "dotenv/config";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { AdminUserModel } from "@/modules/admin/auth/models/AdminUser";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function seedAdminUser() {
  const mongoUri = requiredEnv("MONGODB_URI");
  const adminEmail = requiredEnv("ADMIN_EMAIL").toLowerCase();
  const adminUsername = requiredEnv("ADMIN_USERNAME").toLowerCase();
  const adminPassword = requiredEnv("ADMIN_PASSWORD");
  const dbName = process.env.MONGODB_DB_NAME || "freeCodeCamp";

  await mongoose.connect(mongoUri, { dbName });

  const existing = await AdminUserModel.findOne({
    $or: [{ email: adminEmail }, { username: adminUsername }],
  }).lean();

  if (existing) {
    console.log(
      `[seed-admin] Admin already exists (${existing.username} / ${existing.email}). Skipping create.`,
    );
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await AdminUserModel.create({
    email: adminEmail,
    username: adminUsername,
    passwordHash,
    role: "admin",
    isActive: true,
  });

  console.log("[seed-admin] Admin user created.", {
    id: String(admin._id),
    email: admin.email,
    username: admin.username,
    role: admin.role,
  });
}

seedAdminUser()
  .catch((error) => {
    console.error("[seed-admin] Failed to seed admin user.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
