import type { ClientSession, Types } from "mongoose";

import { CategoryModel, type CategoryDocument } from "@/modules/tradefair/models/Category";

export const categoryRepository = {
  async listByEvent(eventId: string | Types.ObjectId) {
    return CategoryModel.find({ eventId, isArchived: { $ne: true } })
      .sort({ name: 1 })
      .lean<CategoryDocument[]>();
  },

  async findById(categoryId: string | Types.ObjectId) {
    return CategoryModel.findById(categoryId).lean<CategoryDocument | null>();
  },

  async findByEventAndCode(eventId: string, code: string) {
    return CategoryModel.findOne({ eventId, code }).lean<CategoryDocument | null>();
  },

  async create(payload: Partial<CategoryDocument>, session?: ClientSession) {
    const [doc] = await CategoryModel.create([payload], { session });
    return doc.toObject();
  },

  async updateById(
    categoryId: string,
    payload: Partial<CategoryDocument>,
    session?: ClientSession,
  ) {
    return CategoryModel.findByIdAndUpdate(categoryId, payload, {
      returnDocument: "after",
      session,
    }).lean<CategoryDocument | null>();
  },
};
