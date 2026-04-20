import type { CategoryDocument } from "@/modules/tradefair/models/Category";
import type { StandDocument } from "@/modules/tradefair/models/Stand";
import { PRICES } from "@/modules/tradefair/utils/money";

export function resolveSlotPriceKobo(params: {
  stand: Pick<StandDocument, "standType">;
  categories: Pick<CategoryDocument, "priceOverrideKobo" | "code">[];
}) {
  if (params.stand.standType === "premium") return PRICES.premiumKobo;
  if (params.stand.standType === "single") return PRICES.singleKobo;

  const categoryOverride = params.categories.find(
    (category) => typeof category.priceOverrideKobo === "number",
  );
  if (categoryOverride?.priceOverrideKobo) {
    return categoryOverride.priceOverrideKobo;
  }

  return PRICES.sharedSlotKobo;
}
