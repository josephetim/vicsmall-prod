import bcrypt from "bcryptjs";

import { AdminUserModel } from "@/modules/admin/auth/models/AdminUser";
import { CategoryModel } from "@/modules/tradefair/models/Category";
import { EventModel } from "@/modules/tradefair/models/Event";
import { StandModel } from "@/modules/tradefair/models/Stand";
import { StandSlotModel } from "@/modules/tradefair/models/StandSlot";
import { PRICES } from "@/modules/tradefair/utils/money";

interface SeedOptions {
  categoryLimit?: number | null;
  blockFirstSlot?: boolean;
}

export async function seedTradefairData(options: SeedOptions = {}) {
  const adminPassword = "Foundervict0r001";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const adminUser = await AdminUserModel.create({
    email: "admin@vicsmall.test",
    username: "admin",
    passwordHash: adminPasswordHash,
    role: "admin",
    isActive: true,
  });

  const event = await EventModel.create({
    slug: "iuo-2026-tradefair",
    name: "Tradefair Test Event",
    venue: "Test Venue",
    eventDate: new Date("2026-09-26T09:00:00.000Z"),
    status: "live",
    registrationOpenAt: new Date("2026-01-01T00:00:00.000Z"),
    registrationCloseAt: new Date("2026-12-31T23:59:59.000Z"),
    currency: "NGN",
    prices: {
      premiumKobo: PRICES.premiumKobo,
      singleKobo: PRICES.singleKobo,
      sharedCanopyKobo: PRICES.sharedCanopyKobo,
      sharedSlotKobo: PRICES.sharedSlotKobo,
    },
    supportContact: {
      whatsapp: "2349049363602",
      phone: "2349049363602",
      email: "support@vicsmall.test",
    },
    fieldMeta: {
      fenced: true,
      gatePosition: "top-center",
      topLeftFeatures: ["vicsmall-stand", "photo-booth"],
      topFeature: "dj-stage",
      premiumFrontRow: true,
      walkwayStyle: "compact-center",
    },
  });

  const premiumStands = await StandModel.create([
    {
      eventId: event._id,
      standCode: "P1",
      standType: "premium",
      label: "Premium 1",
      columnNo: 1,
      rowNo: 1,
      capacity: 1,
      fullPriceKobo: PRICES.premiumKobo,
      status: "active",
      isBlocked: false,
      metadata: {},
    },
    {
      eventId: event._id,
      standCode: "P2",
      standType: "premium",
      label: "Premium 2",
      columnNo: 2,
      rowNo: 1,
      capacity: 1,
      fullPriceKobo: PRICES.premiumKobo,
      status: "active",
      isBlocked: false,
      metadata: {},
    },
  ]);

  const singleStands = await StandModel.create([
    {
      eventId: event._id,
      standCode: "S1",
      standType: "single",
      label: "Single 1",
      columnNo: 1,
      rowNo: 2,
      capacity: 1,
      fullPriceKobo: PRICES.singleKobo,
      status: "active",
      isBlocked: false,
      metadata: {},
    },
    {
      eventId: event._id,
      standCode: "S2",
      standType: "single",
      label: "Single 2",
      columnNo: 2,
      rowNo: 2,
      capacity: 1,
      fullPriceKobo: PRICES.singleKobo,
      status: "active",
      isBlocked: false,
      metadata: {},
    },
  ]);

  const [sharedStand] = await StandModel.create([
    {
      eventId: event._id,
      standCode: "C1",
      standType: "shared",
      label: "Canopy 1",
      columnNo: 1,
      rowNo: 3,
      capacity: 4,
      fullPriceKobo: PRICES.sharedCanopyKobo,
      status: "active",
      isBlocked: false,
      metadata: {},
    },
  ]);

  const slots = await StandSlotModel.create(
    ["A", "B", "C", "D"].map((label, index) => ({
      eventId: event._id,
      standId: sharedStand._id,
      slotCode: `C1-${label}`,
      slotLabel: `Slot ${label}`,
      slotIndex: index + 1,
      slotPriceKobo: PRICES.sharedSlotKobo,
      status:
        options.blockFirstSlot && index === 0 ? "blocked" : "available",
    })),
  );

  await CategoryModel.create([
    {
      eventId: event._id,
      code: "fashion",
      name: "Fashion",
      isOpen: true,
      limit: options.categoryLimit ?? null,
      priceOverrideKobo: null,
      isArchived: false,
    },
    {
      eventId: event._id,
      code: "food",
      name: "Food",
      isOpen: true,
      limit: null,
      priceOverrideKobo: null,
      isArchived: false,
    },
  ]);

  return {
    adminUser,
    adminCredentials: {
      identifier: "admin",
      password: adminPassword,
    },
    event,
    premiumStands,
    singleStands,
    sharedStand,
    slots,
  };
}
