import { Schema, model, models, Types } from "mongoose";

import type { TradefairAdminRole } from "@/modules/tradefair/types/backend.types";

const roleValues: TradefairAdminRole[] = ["admin", "event_manager", "support"];

export interface AdminUserDocument {
  _id: Types.ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  role: TradefairAdminRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<AdminUserDocument>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: roleValues,
      default: "admin",
      required: true,
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

AdminUserSchema.index({ isActive: 1, role: 1 });

export const AdminUserModel =
  models.AdminUser || model<AdminUserDocument>("AdminUser", AdminUserSchema);
