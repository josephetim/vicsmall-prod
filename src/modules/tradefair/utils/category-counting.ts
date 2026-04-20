import type { CategoryDocument } from "@/modules/tradefair/models/Category";

import { conflict, unprocessableEntity } from "@/backend/utils/http-error";

export function normalizeCategoryCodes(input: string[]) {
  const normalized = input
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

export function assertAllCategoriesOpenAndWithinLimit(params: {
  selectedCategoryCodes: string[];
  categories: CategoryDocument[];
  categoryUsageMap: Record<string, number>;
}) {
  for (const code of params.selectedCategoryCodes) {
    const category = params.categories.find((item) => item.code === code);
    if (!category) {
      throw unprocessableEntity(`Category "${code}" is not allowed for this event.`);
    }
    if (!category.isOpen) {
      throw conflict(`Category "${category.name}" is currently closed.`);
    }
    if (typeof category.limit === "number") {
      const usage = params.categoryUsageMap[category.code] ?? 0;
      if (usage >= category.limit) {
        throw conflict(
          `Category "${category.name}" has reached its limit (${category.limit}).`,
          { categoryCode: category.code, categoryLimit: category.limit, usage },
        );
      }
    }
  }
}
