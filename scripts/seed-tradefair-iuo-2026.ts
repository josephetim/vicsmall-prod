import "dotenv/config";

import mongoose from "mongoose";

import { CategoryModel } from "@/modules/tradefair/models/Category";
import { EventModel } from "@/modules/tradefair/models/Event";
import { LayoutModel } from "@/modules/tradefair/models/Layout";
import { LayoutVersionModel } from "@/modules/tradefair/models/LayoutVersion";
import { StandModel } from "@/modules/tradefair/models/Stand";
import { StandSlotModel } from "@/modules/tradefair/models/StandSlot";
import { StandZoneModel } from "@/modules/tradefair/models/StandZone";
import { TermsVersionModel } from "@/modules/tradefair/models/TermsVersion";
import { PRICES } from "@/modules/tradefair/utils/money";

type SeededStand = {
  _id: mongoose.Types.ObjectId;
  standType: "premium" | "single" | "shared";
  standCode: string;
};

const EVENT_SLUG = process.env.TRADEFAIR_EVENT_SLUG || "iuo-2026-tradefair";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "vicsmall_tradefair";

async function seed() {
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });

  const existing = await EventModel.findOne({ slug: EVENT_SLUG }).lean();
  if (existing) {
    await Promise.all([
      StandSlotModel.deleteMany({ eventId: existing._id }),
      StandModel.deleteMany({ eventId: existing._id }),
      StandZoneModel.deleteMany({ eventId: existing._id }),
      CategoryModel.deleteMany({ eventId: existing._id }),
      TermsVersionModel.deleteMany({ eventId: existing._id }),
      LayoutVersionModel.deleteMany({ eventId: existing._id }),
      LayoutModel.deleteMany({ eventId: existing._id }),
      EventModel.deleteOne({ _id: existing._id }),
    ]);
  }

  const event = await EventModel.create({
    slug: EVENT_SLUG,
    name: "Vicsmall Trade Fair IUO 2026",
    venue: "IUO Main Campus Field",
    eventDate: new Date("2026-09-26T09:00:00.000Z"),
    status: "live",
    registrationOpenAt: new Date("2026-05-01T00:00:00.000Z"),
    registrationCloseAt: new Date("2026-09-20T23:59:59.000Z"),
    currency: "NGN",
    prices: {
      premiumKobo: PRICES.premiumKobo,
      singleKobo: PRICES.singleKobo,
      sharedCanopyKobo: PRICES.sharedCanopyKobo,
      sharedSlotKobo: PRICES.sharedSlotKobo,
    },
    supportContact: {
      whatsapp: process.env.WHATSAPP_SUPPORT_NUMBER || "2349049363602",
      phone: "2349049363602",
      email: "support@vicsmall.com",
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

  const [premiumZone, singleZone, sharedZone] = await StandZoneModel.create([
    {
      eventId: event._id,
      code: "premium-zone",
      name: "Premium Zone",
      sortOrder: 1,
    },
    {
      eventId: event._id,
      code: "single-zone",
      name: "Single Zone",
      sortOrder: 2,
    },
    {
      eventId: event._id,
      code: "shared-zone",
      name: "Shared Canopy Zone",
      sortOrder: 3,
    },
  ]);

  const premiumStandsPayload = Array.from({ length: 4 }).map((_, index) => ({
    eventId: event._id,
    zoneId: premiumZone._id,
    standCode: `P${index + 1}`,
    standType: "premium" as const,
    label: `Premium Stand ${index + 1}`,
    columnNo: index + 1,
    rowNo: 1,
    xPosition: index + 1,
    yPosition: 1,
    capacity: 1,
    fullPriceKobo: PRICES.premiumKobo,
    status: "active" as const,
    isBlocked: false,
    metadata: {},
  }));

  const singleStandsPayload = Array.from({ length: 36 }).map((_, index) => {
    const rowIndex = Math.floor(index / 6) + 2;
    const colIndex = (index % 6) + 1;
    return {
      eventId: event._id,
      zoneId: singleZone._id,
      standCode: `S${String(index + 1).padStart(2, "0")}`,
      standType: "single" as const,
      label: `Single Stand ${index + 1}`,
      columnNo: colIndex,
      rowNo: rowIndex,
      xPosition: colIndex,
      yPosition: rowIndex,
      capacity: 1,
      fullPriceKobo: PRICES.singleKobo,
      status: "active" as const,
      isBlocked: false,
      metadata: {},
    };
  });

  const sharedStandsPayload = Array.from({ length: 24 }).map((_, index) => {
    const rowIndex = Math.floor(index / 6) + 8;
    const colIndex = (index % 6) + 1;
    return {
      eventId: event._id,
      zoneId: sharedZone._id,
      standCode: `C${String(index + 1).padStart(2, "0")}`,
      standType: "shared" as const,
      label: `Shared Canopy ${index + 1}`,
      columnNo: colIndex,
      rowNo: rowIndex,
      xPosition: colIndex,
      yPosition: rowIndex,
      capacity: 4,
      fullPriceKobo: PRICES.sharedCanopyKobo,
      status: "active" as const,
      isBlocked: false,
      metadata: {},
    };
  });

  const allStands: SeededStand[] = await StandModel.create([
    ...premiumStandsPayload,
    ...singleStandsPayload,
    ...sharedStandsPayload,
  ]);

  const sharedStands = allStands.filter((stand) => stand.standType === "shared");
  const slotLabels = ["A", "B", "C", "D"] as const;
  const slotsPayload = sharedStands.flatMap((stand) =>
    slotLabels.map((label, index) => ({
      eventId: event._id,
      standId: stand._id,
      slotCode: `${stand.standCode}-${label}`,
      slotLabel: `Slot ${label}`,
      slotIndex: index + 1,
      slotPriceKobo: PRICES.sharedSlotKobo,
      status: "available" as const,
      heldUntil: null,
      vendorSnapshot: undefined,
    })),
  );

  await StandSlotModel.create(slotsPayload);

  await CategoryModel.create([
    {
      eventId: event._id,
      code: "fashion",
      name: "Fashion",
      isOpen: true,
      limit: null,
      priceOverrideKobo: null,
      isArchived: false,
    },
    {
      eventId: event._id,
      code: "food",
      name: "Food & Drinks",
      isOpen: true,
      limit: null,
      priceOverrideKobo: null,
      isArchived: false,
    },
    {
      eventId: event._id,
      code: "beauty",
      name: "Beauty & Wellness",
      isOpen: true,
      limit: null,
      priceOverrideKobo: null,
      isArchived: false,
    },
    {
      eventId: event._id,
      code: "electronics",
      name: "Electronics",
      isOpen: true,
      limit: null,
      priceOverrideKobo: null,
      isArchived: false,
    },
    {
      eventId: event._id,
      code: "services",
      name: "Services",
      isOpen: true,
      limit: null,
      priceOverrideKobo: null,
      isArchived: false,
    },
  ]);

  await TermsVersionModel.create({
    eventId: event._id,
    version: 1,
    title: "Vicsmall Trade Fair Terms 2026",
    content:
      "By registering, vendors agree to follow event policies, booth safety rules, and payment requirements.",
    status: "active",
    activatedAt: new Date(),
  });

  const layout = await LayoutModel.create({
    eventId: event._id,
    name: "IUO Field Layout v1",
    description: "Initial published field layout for IUO 2026 event.",
    isPublished: true,
    publishedAt: new Date(),
  });

  const layoutVersion = await LayoutVersionModel.create({
    eventId: event._id,
    layoutId: layout._id,
    version: 1,
    status: "published",
    metadata: {
      gatePosition: "top-center",
      fixedFeatures: {
        topLeft: ["vicsmall-stand", "photo-booth"],
        topCenter: "stage",
        fence: true,
        walkway: "compact-center",
      },
      counts: {
        premium: 4,
        single: 36,
        sharedCanopies: 24,
        sharedSlotsPerCanopy: 4,
      },
    },
    publishedAt: new Date(),
  });

  await LayoutModel.findByIdAndUpdate(layout._id, {
    currentVersionId: layoutVersion._id,
  });

  console.log("Tradefair seed complete", {
    eventId: String(event._id),
    slug: EVENT_SLUG,
    premiumStands: premiumStandsPayload.length,
    singleStands: singleStandsPayload.length,
    sharedStands: sharedStandsPayload.length,
    sharedSlots: slotsPayload.length,
  });
}

seed()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
