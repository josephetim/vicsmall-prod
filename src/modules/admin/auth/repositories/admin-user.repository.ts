import type { ClientSession, Types } from "mongoose";

import { AdminUserModel, type AdminUserDocument } from "@/modules/admin/auth/models/AdminUser";

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

export const adminUserRepository = {
  async findById(id: string | Types.ObjectId) {
    return AdminUserModel.findById(id).lean<AdminUserDocument | null>();
  },

  async findByEmail(email: string) {
    return AdminUserModel.findOne({
      email: normalizeIdentifier(email),
    }).lean<AdminUserDocument | null>();
  },

  async findByUsername(username: string) {
    return AdminUserModel.findOne({
      username: normalizeIdentifier(username),
    }).lean<AdminUserDocument | null>();
  },

  async findByIdentifier(identifier: string) {
    const normalized = normalizeIdentifier(identifier);
    return AdminUserModel.findOne({
      $or: [{ email: normalized }, { username: normalized }],
    }).lean<AdminUserDocument | null>();
  },

  async create(payload: Partial<AdminUserDocument>, session?: ClientSession) {
    const [doc] = await AdminUserModel.create([payload], { session });
    return doc.toObject();
  },

  async updateById(
    id: string | Types.ObjectId,
    payload: Partial<AdminUserDocument>,
    session?: ClientSession,
  ) {
    return AdminUserModel.findByIdAndUpdate(id, payload, {
      returnDocument: "after",
      session,
    }).lean<AdminUserDocument | null>();
  },
};
