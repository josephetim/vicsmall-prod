import { describe, expect, it } from "vitest";

import { buildBookingReference } from "@/modules/tradefair/utils/booking-reference";
import {
  assertAllCategoriesOpenAndWithinLimit,
  normalizeCategoryCodes,
} from "@/modules/tradefair/utils/category-counting";
import { koboToNaira, nairaToKobo } from "@/modules/tradefair/utils/money";
import { buildPaystackSignature, isValidPaystackSignature } from "@/modules/tradefair/utils/paystack-signature";
import { resolveSlotPriceKobo } from "@/modules/tradefair/utils/slot-pricing";

describe("tradefair utility unit tests", () => {
  it("builds booking references with expected prefix", () => {
    const ref = buildBookingReference();
    expect(ref).toMatch(/^VIC-TF-/);
  });

  it("converts money values correctly", () => {
    expect(nairaToKobo(14825)).toBe(1482500);
    expect(koboToNaira(2200000)).toBe(22000);
  });

  it("resolves slot pricing by stand type and category override", () => {
    const premium = resolveSlotPriceKobo({
      stand: { standType: "premium" },
      categories: [],
    });
    const sharedOverride = resolveSlotPriceKobo({
      stand: { standType: "shared" },
      categories: [{ code: "fashion", priceOverrideKobo: 1000000 }],
    });

    expect(premium).toBe(5500000);
    expect(sharedOverride).toBe(1000000);
  });

  it("normalizes category codes and enforces limits/open state", () => {
    const normalized = normalizeCategoryCodes([" Fashion ", "fashion", "Food"]);
    expect(normalized).toEqual(["fashion", "food"]);

    expect(() =>
      assertAllCategoriesOpenAndWithinLimit({
        selectedCategoryCodes: ["fashion"],
        categories: [
          {
            _id: undefined as never,
            eventId: undefined as never,
            code: "fashion",
            name: "Fashion",
            isOpen: true,
            limit: 1,
            priceOverrideKobo: null,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        categoryUsageMap: { fashion: 1 },
      }),
    ).toThrowError(/reached its limit/i);
  });

  it("validates paystack signatures", () => {
    const payload = "{\"event\":\"charge.success\"}";
    const secret = "test_secret";
    const signature = buildPaystackSignature(payload, secret);

    expect(
      isValidPaystackSignature({
        rawBody: payload,
        signature,
        secret,
      }),
    ).toBe(true);
    expect(
      isValidPaystackSignature({
        rawBody: payload,
        signature: "bad",
        secret,
      }),
    ).toBe(false);
  });
});
