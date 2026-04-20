import type { Model } from "mongoose";

import type { PaginatedResult } from "@/modules/tradefair/types/backend.types";

export function buildPagination(page?: number, limit?: number) {
  const safePage = Number.isFinite(page) && page && page > 0 ? page : 1;
  const safeLimit =
    Number.isFinite(limit) && limit && limit > 0 && limit <= 100 ? limit : 20;
  const skip = (safePage - 1) * safeLimit;
  return { page: safePage, limit: safeLimit, skip };
}

export async function paginateModel<T>(
  model: Model<T>,
  filter: Record<string, unknown>,
  page?: number,
  limit?: number,
  sort: Record<string, 1 | -1> = { createdAt: -1 },
): Promise<PaginatedResult<T>> {
  const pagination = buildPagination(page, limit);
  const [items, total] = await Promise.all([
    model
      .find(filter)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<T[]>(),
    model.countDocuments(filter),
  ]);
  return {
    items,
    total,
    page: pagination.page,
    limit: pagination.limit,
    pages: Math.max(1, Math.ceil(total / pagination.limit)),
  };
}
