import { Types } from "mongoose";

import { badRequest, notFound } from "@/backend/utils/http-error";
import { categoryRepository } from "@/modules/tradefair/repositories/category.repository";
import { registrationRepository } from "@/modules/tradefair/repositories/registration.repository";
import { CategoryModel } from "@/modules/tradefair/models/Category";
import { categoryUpdateSchema } from "@/modules/tradefair/validators/category-update.validator";

export const tradefairCategoryService = {
  async listByEvent(eventId: string) {
    return categoryRepository.listByEvent(eventId);
  },

  async updateCategory(categoryId: string, payload: unknown) {
    const parsed = categoryUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      throw badRequest("Invalid category update payload.", parsed.error.flatten());
    }

    const updated = await categoryRepository.updateById(categoryId, parsed.data);
    if (!updated) {
      throw notFound("Category not found.");
    }
    return updated;
  },

  async getUsageMap(eventId: string, categoryCodes: string[]) {
    if (categoryCodes.length === 0) return {};
    const eventObjectId = new Types.ObjectId(eventId);
    const rows = await CategoryModel.db
      .collection("registrations")
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            eventId: eventObjectId,
            registrationStatus: { $in: registrationRepository.activeStatuses },
            categories: { $in: categoryCodes },
          },
        },
        { $unwind: "$categories" },
        { $match: { categories: { $in: categoryCodes } } },
        { $group: { _id: "$categories", count: { $sum: 1 } } },
      ])
      .toArray();

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});
  },
};
