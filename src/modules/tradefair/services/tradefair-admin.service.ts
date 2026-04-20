import mongoose, { Types } from "mongoose";

import { badRequest, conflict, notFound } from "@/backend/utils/http-error";
import { ensureObjectId } from "@/backend/utils/mongo";
import { buildPagination } from "@/modules/tradefair/repositories/repository.utils";
import { auditLogRepository } from "@/modules/tradefair/repositories/audit-log.repository";
import { categoryRepository } from "@/modules/tradefair/repositories/category.repository";
import { paymentRepository } from "@/modules/tradefair/repositories/payment.repository";
import { registrationRepository } from "@/modules/tradefair/repositories/registration.repository";
import { standRepository } from "@/modules/tradefair/repositories/stand.repository";
import { standSlotRepository } from "@/modules/tradefair/repositories/stand-slot.repository";
import { tradefairEventRepository } from "@/modules/tradefair/repositories/tradefair-event.repository";
import { vendorRepository } from "@/modules/tradefair/repositories/vendor.repository";
import { AdminNoteModel } from "@/modules/tradefair/models/AdminNote";
import { PaymentModel } from "@/modules/tradefair/models/Payment";
import { RegistrationModel } from "@/modules/tradefair/models/Registration";
import { StandModel } from "@/modules/tradefair/models/Stand";
import { StandSlotModel } from "@/modules/tradefair/models/StandSlot";
import { VendorModel } from "@/modules/tradefair/models/Vendor";
import { adminUpdateRegistrationSchema } from "@/modules/tradefair/validators/admin-update-registration.validator";
import { categoryUpdateSchema } from "@/modules/tradefair/validators/category-update.validator";
import { normalizeCategoryCodes } from "@/modules/tradefair/utils/category-counting";
import { resolveSlotPriceKobo } from "@/modules/tradefair/utils/slot-pricing";
import type {
  PaymentStatus,
  RegistrationFilterQuery,
  RegistrationStatus,
  SlotStatus,
  StandType,
} from "@/modules/tradefair/types/backend.types";

const ACTIVE_REGISTRATION_STATUSES: RegistrationStatus[] = [
  "held",
  "pending_payment",
  "paid",
];

const blockedStandActions = new Set(["block", "unblock"]);
const blockedSlotActions = new Set(["block", "unblock"]);

function parsePagination(query: { page?: unknown; limit?: unknown }) {
  const page = query.page ? Number(query.page) : undefined;
  const limit = query.limit ? Number(query.limit) : undefined;
  return buildPagination(page, limit);
}

function toRegex(value?: string) {
  if (!value) return undefined;
  return new RegExp(value.trim(), "i");
}

function objectIdMap<T extends { _id: Types.ObjectId }>(items: T[]) {
  return items.reduce<Record<string, T>>((acc, item) => {
    acc[String(item._id)] = item;
    return acc;
  }, {});
}

function computeStandOccupancyStatus(params: {
  standType: StandType;
  standBlocked: boolean;
  standStatus: "active" | "disabled" | "hidden";
  standRegistrations: Array<{ registrationStatus: RegistrationStatus }>;
  standSlots: Array<{ status: SlotStatus }>;
}): SlotStatus {
  if (params.standBlocked || params.standStatus !== "active") return "blocked";

  if (params.standType === "shared") {
    if (params.standSlots.some((slot) => slot.status === "paid")) return "paid";
    if (params.standSlots.some((slot) => slot.status === "held")) return "held";
    return "available";
  }

  if (params.standRegistrations.some((registration) => registration.registrationStatus === "paid")) {
    return "paid";
  }
  if (params.standRegistrations.some((registration) => registration.registrationStatus !== "expired")) {
    return "held";
  }
  return "available";
}

function parseStandUpdatePayload(payload: unknown) {
  const parsed =
    payload && typeof payload === "object"
      ? (payload as {
          action?: string;
          fullPriceKobo?: number;
          metadata?: Record<string, unknown>;
          status?: "active" | "disabled" | "hidden";
          isBlocked?: boolean;
        })
      : {};

  const action = parsed.action;
  if (!action) {
    throw badRequest("Stand update action is required.");
  }

  if (
    ![
      "block",
      "unblock",
      "disable",
      "hide",
      "activate",
      "update",
    ].includes(action)
  ) {
    throw badRequest("Invalid stand update action.");
  }

  return {
    action,
    fullPriceKobo: parsed.fullPriceKobo,
    metadata: parsed.metadata,
    status: parsed.status,
    isBlocked: parsed.isBlocked,
  };
}

function parseSlotUpdatePayload(payload: unknown) {
  const parsed =
    payload && typeof payload === "object"
      ? (payload as {
          action?: string;
          status?: SlotStatus;
          vendorSnapshot?: {
            vendorId?: string;
            vendorName?: string;
            brandName?: string;
          };
        })
      : {};

  const action = parsed.action;
  if (!action) {
    throw badRequest("Stand slot update action is required.");
  }

  if (!["block", "unblock", "set_status", "update_snapshot"].includes(action)) {
    throw badRequest("Invalid stand slot update action.");
  }

  return {
    action,
    status: parsed.status,
    vendorSnapshot: parsed.vendorSnapshot,
  };
}

export const tradefairAdminService = {
  async getDashboard(eventId: string) {
    const eventObjectId = ensureObjectId(eventId, "eventId");
    const event = await tradefairEventRepository.findById(eventObjectId);
    if (!event) throw notFound("Event not found.");

    const now = new Date();

    const [stands, slots, registrations, payments, categories, categoryUsageRows] =
      await Promise.all([
        standRepository.findByEventId(eventObjectId),
        standSlotRepository.findByEventId(eventObjectId),
        RegistrationModel.find({ eventId: eventObjectId }).lean(),
        PaymentModel.find({ eventId: eventObjectId }).lean(),
        categoryRepository.listByEvent(eventObjectId),
        RegistrationModel.aggregate<{ _id: string; totalVendors: number }>([
          {
            $match: {
              eventId: eventObjectId,
              registrationStatus: { $in: ACTIVE_REGISTRATION_STATUSES },
            },
          },
          { $unwind: "$categories" },
          {
            $group: {
              _id: "$categories",
              totalVendors: { $sum: 1 },
            },
          },
        ]),
      ]);

    const premiumTotal = stands.filter((stand) => stand.standType === "premium").length;
    const singleTotal = stands.filter((stand) => stand.standType === "single").length;
    const sharedSlotsTotal = slots.length;

    const paidRegistrations = registrations.filter(
      (registration) => registration.registrationStatus === "paid",
    );

    const premiumSold = paidRegistrations.filter(
      (registration) => registration.standType === "premium",
    ).length;
    const singleSold = paidRegistrations.filter(
      (registration) => registration.standType === "single",
    ).length;
    const sharedSlotsSold = paidRegistrations.filter(
      (registration) => registration.standType === "shared",
    ).length;

    const activeHolds = registrations.filter(
      (registration) =>
        ["held", "pending_payment"].includes(registration.registrationStatus) &&
        (!registration.holdExpiresAt || registration.holdExpiresAt > now),
    ).length;

    const expiredHolds = registrations.filter(
      (registration) => registration.registrationStatus === "expired",
    ).length;

    const failedPayments = payments.filter(
      (payment) => payment.paymentStatus === "failed",
    ).length;
    const abandonedPayments = payments.filter(
      (payment) => payment.paymentStatus === "abandoned",
    ).length;

    const totalRevenueKobo = payments
      .filter((payment) => payment.paymentStatus === "success")
      .reduce((sum, payment) => sum + payment.amountKobo, 0);

    const totalInventory = premiumTotal + singleTotal + sharedSlotsTotal;
    const totalSold = premiumSold + singleSold + sharedSlotsSold;

    const categoryUsageMap = categoryUsageRows.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row._id] = row.totalVendors;
        return acc;
      },
      {},
    );

    return {
      event: {
        id: String(event._id),
        slug: event.slug,
        name: event.name,
        status: event.status,
        eventDate: event.eventDate,
      },
      metrics: {
        premiumSold,
        premiumRemaining: Math.max(0, premiumTotal - premiumSold),
        singleSold,
        singleRemaining: Math.max(0, singleTotal - singleSold),
        sharedSlotsSold,
        sharedSlotsRemaining: Math.max(0, sharedSlotsTotal - sharedSlotsSold),
        activeHolds,
        expiredHolds,
        failedPayments,
        abandonedPayments,
        totalRevenueKobo,
        occupancyRate: totalInventory > 0 ? Number((totalSold / totalInventory).toFixed(4)) : 0,
      },
      categorySummary: categories.map((category) => ({
        category: category.code,
        categoryName: category.name,
        totalVendors: categoryUsageMap[category.code] ?? 0,
        limit: category.limit,
        isOpen: category.isOpen,
      })),
    };
  },

  async listRegistrations(eventId: string, query: RegistrationFilterQuery) {
    const eventObjectId = ensureObjectId(eventId, "eventId");
    const event = await tradefairEventRepository.findById(eventObjectId);
    if (!event) throw notFound("Event not found.");

    const pagination = parsePagination(query);
    const filter: Record<string, unknown> = { eventId: eventObjectId };

    if (query.standType) filter.standType = query.standType;
    if (query.registrationStatus) filter.registrationStatus = query.registrationStatus;
    if (query.bookingReference) filter.bookingReference = toRegex(query.bookingReference);
    if (query.category) filter.categories = query.category;

    if (query.fromDate || query.toDate) {
      filter.createdAt = {};
      if (query.fromDate) {
        (filter.createdAt as Record<string, unknown>).$gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        (filter.createdAt as Record<string, unknown>).$lte = new Date(query.toDate);
      }
    }

    if (query.standCode) {
      const standMatches = await StandModel.find({
        eventId: eventObjectId,
        standCode: toRegex(query.standCode),
      })
        .select({ _id: 1 })
        .lean();
      filter.standId = {
        $in: standMatches.map((stand) => stand._id),
      };
    }

    if (query.vendorName || query.brandName || query.phone) {
      const vendorFilter: Record<string, unknown> = {};
      if (query.brandName) vendorFilter.brandName = toRegex(query.brandName);
      if (query.phone) vendorFilter.phone = toRegex(query.phone);
      if (query.vendorName) {
        const nameRegex = toRegex(query.vendorName);
        vendorFilter.$or = [{ firstName: nameRegex }, { lastName: nameRegex }];
      }
      const vendorRows = await VendorModel.find(vendorFilter).select({ _id: 1 }).lean();
      filter.vendorId = { $in: vendorRows.map((vendor) => vendor._id) };
    }

    if (query.paymentStatus) {
      const paymentRows = await PaymentModel.find({
        eventId: eventObjectId,
        paymentStatus: query.paymentStatus,
      })
        .select({ registrationId: 1 })
        .lean();
      filter._id = {
        $in: paymentRows.map((payment) => payment.registrationId),
      };
    }

    const [items, total] = await Promise.all([
      RegistrationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      RegistrationModel.countDocuments(filter),
    ]);

    const vendorIds = items.map((item) => item.vendorId);
    const standIds = items.map((item) => item.standId);
    const slotIds = items
      .map((item) => item.standSlotId)
      .filter((slotId): slotId is Types.ObjectId => Boolean(slotId));
    const registrationIds = items.map((item) => item._id);

    const [vendors, stands, slots, payments] = await Promise.all([
      VendorModel.find({ _id: { $in: vendorIds } }).lean(),
      StandModel.find({ _id: { $in: standIds } }).lean(),
      slotIds.length > 0
        ? StandSlotModel.find({ _id: { $in: slotIds } }).lean()
        : Promise.resolve([]),
      PaymentModel.find({ registrationId: { $in: registrationIds } })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const vendorMap = objectIdMap(vendors);
    const standMap = objectIdMap(stands);
    const slotMap = objectIdMap(slots);

    const latestPaymentMap = payments.reduce<Record<string, (typeof payments)[number]>>(
      (acc, payment) => {
        const key = String(payment.registrationId);
        if (!acc[key]) {
          acc[key] = payment;
        }
        return acc;
      },
      {},
    );

    return {
      items: items.map((registration) => {
        const vendor = vendorMap[String(registration.vendorId)];
        const stand = standMap[String(registration.standId)];
        const slot = registration.standSlotId
          ? slotMap[String(registration.standSlotId)]
          : null;
        const payment = latestPaymentMap[String(registration._id)] ?? null;

        return {
          registrationId: String(registration._id),
          bookingReference: registration.bookingReference,
          registrationStatus: registration.registrationStatus,
          standType: registration.standType,
          categories: registration.categories,
          amountKobo: registration.amountKobo,
          holdExpiresAt: registration.holdExpiresAt,
          createdAt: registration.createdAt,
          updatedAt: registration.updatedAt,
          vendor: vendor
            ? {
                id: String(vendor._id),
                firstName: vendor.firstName,
                lastName: vendor.lastName,
                phone: vendor.phone,
                email: vendor.email,
                brandName: vendor.brandName,
                businessCategory: vendor.businessCategory,
              }
            : null,
          stand: stand
            ? {
                id: String(stand._id),
                standCode: stand.standCode,
                label: stand.label,
              }
            : null,
          slot: slot
            ? {
                id: String(slot._id),
                slotCode: slot.slotCode,
                slotLabel: slot.slotLabel,
              }
            : null,
          payment: payment
            ? {
                paymentId: String(payment._id),
                status: payment.paymentStatus,
                reference: payment.gatewayReference,
                channel: payment.channel,
                paidAt: payment.paidAt,
              }
            : null,
        };
      }),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        pages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  },

  async getRegistrationDetail(registrationId: string) {
    const registrationObjectId = ensureObjectId(registrationId, "registrationId");
    const registration = await registrationRepository.findById(registrationObjectId);
    if (!registration) throw notFound("Registration not found.");

    const [vendor, stand, slot, payments, notes, auditLogs] = await Promise.all([
      vendorRepository.findById(registration.vendorId),
      standRepository.findById(registration.standId),
      registration.standSlotId
        ? standSlotRepository.findById(registration.standSlotId)
        : Promise.resolve(null),
      PaymentModel.find({ registrationId: registrationObjectId })
        .sort({ createdAt: -1 })
        .lean(),
      AdminNoteModel.find({ registrationId: registrationObjectId })
        .sort({ createdAt: -1 })
        .lean(),
      auditLogRepository.listByEntity("registration", registrationId),
    ]);

    return {
      registration: {
        id: String(registration._id),
        bookingReference: registration.bookingReference,
        registrationStatus: registration.registrationStatus,
        standType: registration.standType,
        amountKobo: registration.amountKobo,
        currency: registration.currency,
        categories: registration.categories,
        termsAccepted: registration.termsAccepted,
        termsAcceptedAt: registration.termsAcceptedAt,
        holdExpiresAt: registration.holdExpiresAt,
        paymentDueAt: registration.paymentDueAt,
        paidAt: registration.paidAt,
        cancelledAt: registration.cancelledAt,
        refundedAt: registration.refundedAt,
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt,
      },
      vendor,
      stand,
      slot,
      payments,
      notes,
      auditLogs,
    };
  },

  async updateRegistration(registrationId: string, payload: unknown, actorId: string) {
    const parsed = adminUpdateRegistrationSchema.parse(payload);
    const registrationObjectId = ensureObjectId(registrationId, "registrationId");
    const session = await mongoose.startSession();

    const releaseSlotIfEligible = async (
      slotId: Types.ObjectId | undefined,
      eventId: Types.ObjectId,
      txSession: mongoose.ClientSession,
    ) => {
      if (!slotId) return;
      const paidCount = await RegistrationModel.countDocuments({
        eventId,
        standSlotId: slotId,
        registrationStatus: "paid",
      }).session(txSession);

      if (paidCount === 0) {
        await standSlotRepository.updateById(
          slotId,
          {
            status: "available",
            heldUntil: undefined,
            vendorSnapshot: undefined,
          },
          txSession,
        );
      }
    };

    try {
      await session.withTransaction(async () => {
        const registration = await registrationRepository.findByIdForUpdate(
          registrationObjectId,
          session,
        );

        if (!registration) throw notFound("Registration not found.");

        switch (parsed.action) {
          case "add_note": {
            await AdminNoteModel.create(
              [
                {
                  eventId: registration.eventId,
                  registrationId: registration._id,
                  adminUserId: actorId,
                  note: parsed.note,
                },
              ],
              { session },
            );

            await auditLogRepository.create(
              {
                eventId: String(registration.eventId),
                actorType: "admin",
                actorId,
                action: "admin_note_added",
                entityType: "registration",
                entityId: registration._id,
                metadata: { note: parsed.note },
              },
              session,
            );
            break;
          }

          case "cancel_registration": {
            if (registration.registrationStatus === "paid") {
              throw conflict("Paid registration cannot be cancelled directly. Mark refunded instead.");
            }

            await registrationRepository.updateById(
              registration._id,
              {
                registrationStatus: "cancelled",
                cancelledAt: new Date(),
              },
              session,
            );

            await releaseSlotIfEligible(registration.standSlotId, registration.eventId, session);

            await auditLogRepository.create(
              {
                eventId: String(registration.eventId),
                actorType: "admin",
                actorId,
                action: "registration_cancelled",
                entityType: "registration",
                entityId: registration._id,
                metadata: { reason: parsed.reason },
              },
              session,
            );
            break;
          }

          case "reassign_stand": {
            if (["paid", "cancelled", "refunded"].includes(registration.registrationStatus)) {
              throw conflict("Registration cannot be reassigned in its current status.");
            }

            const targetStand = await standRepository.findByIdForUpdate(parsed.standId, session);
            if (!targetStand) throw notFound("Target stand not found.");
            if (String(targetStand.eventId) !== String(registration.eventId)) {
              throw conflict("Target stand does not belong to registration event.");
            }
            if (targetStand.isBlocked || targetStand.status !== "active") {
              throw conflict("Target stand is blocked or unavailable.");
            }
            if (targetStand.standType === "shared") {
              throw badRequest("Use reassign_slot for shared slot reassignment.");
            }

            const existingActive = await registrationRepository.findByStandIdWithActiveStatuses(
              targetStand._id,
              session,
            );
            if (existingActive && String(existingActive._id) !== String(registration._id)) {
              throw conflict("Target stand already has an active booking.");
            }

            await releaseSlotIfEligible(registration.standSlotId, registration.eventId, session);

            const categories = await categoryRepository.listByEvent(registration.eventId);
            const selectedCategories = categories.filter((category) =>
              registration.categories.includes(category.code),
            );
            const amountKobo = resolveSlotPriceKobo({
              stand: targetStand,
              categories: selectedCategories,
            });

            await registrationRepository.updateById(
              registration._id,
              {
                standId: targetStand._id,
                standType: targetStand.standType,
                standSlotId: undefined,
                amountKobo,
              },
              session,
            );

            await auditLogRepository.create(
              {
                eventId: String(registration.eventId),
                actorType: "admin",
                actorId,
                action: "reassigned_stand",
                entityType: "registration",
                entityId: registration._id,
                metadata: {
                  fromStandId: String(registration.standId),
                  toStandId: String(targetStand._id),
                },
              },
              session,
            );
            break;
          }

          case "reassign_slot": {
            if (registration.standType !== "shared") {
              throw badRequest("Only shared stand registrations can be reassigned by slot.");
            }
            if (["paid", "cancelled", "refunded"].includes(registration.registrationStatus)) {
              throw conflict("Registration cannot be reassigned in its current status.");
            }

            const targetSlot = await standSlotRepository.findByIdForUpdate(parsed.standSlotId, session);
            if (!targetSlot) throw notFound("Target stand slot not found.");
            if (String(targetSlot.eventId) !== String(registration.eventId)) {
              throw conflict("Target slot does not belong to registration event.");
            }

            const heldUntil =
              registration.holdExpiresAt ??
              new Date(Date.now() + Number(process.env.TRADEFAIR_HOLD_MINUTES ?? 20) * 60 * 1000);

            const heldSlot = await StandSlotModel.findOneAndUpdate(
              {
                _id: targetSlot._id,
                status: "available",
              },
              {
                $set: {
                  status: "held",
                  heldUntil,
                },
              },
              { session, returnDocument: "after" },
            ).lean();

            if (!heldSlot) {
              throw conflict("Target stand slot is not available.");
            }

            await releaseSlotIfEligible(registration.standSlotId, registration.eventId, session);

            const stand = await standRepository.findById(registration.standId);
            if (!stand) throw notFound("Registration stand not found.");
            const categories = await categoryRepository.listByEvent(registration.eventId);
            const selectedCategories = categories.filter((category) =>
              registration.categories.includes(category.code),
            );
            const amountKobo = resolveSlotPriceKobo({
              stand,
              categories: selectedCategories,
            });

            await registrationRepository.updateById(
              registration._id,
              {
                standSlotId: targetSlot._id,
                amountKobo,
                holdExpiresAt: heldUntil,
                paymentDueAt: heldUntil,
              },
              session,
            );

            await auditLogRepository.create(
              {
                eventId: String(registration.eventId),
                actorType: "admin",
                actorId,
                action: "reassigned_stand",
                entityType: "registration",
                entityId: registration._id,
                metadata: {
                  fromSlotId: registration.standSlotId ? String(registration.standSlotId) : null,
                  toSlotId: String(targetSlot._id),
                },
              },
              session,
            );
            break;
          }

          case "mark_refunded": {
            if (registration.registrationStatus !== "paid") {
              throw conflict("Only paid registrations can be marked refunded.");
            }

            await registrationRepository.updateById(
              registration._id,
              {
                registrationStatus: "refunded",
                refundedAt: new Date(),
              },
              session,
            );

            await PaymentModel.updateMany(
              {
                registrationId: registration._id,
                paymentStatus: "success",
              },
              {
                $set: {
                  paymentStatus: "refunded",
                },
              },
              { session },
            );

            await releaseSlotIfEligible(registration.standSlotId, registration.eventId, session);

            await auditLogRepository.create(
              {
                eventId: String(registration.eventId),
                actorType: "admin",
                actorId,
                action: "registration_refunded",
                entityType: "registration",
                entityId: registration._id,
                metadata: { reason: parsed.reason },
              },
              session,
            );
            break;
          }

          case "manual_status": {
            await registrationRepository.updateById(
              registration._id,
              {
                registrationStatus: parsed.registrationStatus,
              },
              session,
            );

            if (["expired", "cancelled", "refunded"].includes(parsed.registrationStatus)) {
              await releaseSlotIfEligible(registration.standSlotId, registration.eventId, session);
            }

            await auditLogRepository.create(
              {
                eventId: String(registration.eventId),
                actorType: "admin",
                actorId,
                action: "manual_registration_status",
                entityType: "registration",
                entityId: registration._id,
                metadata: { registrationStatus: parsed.registrationStatus },
              },
              session,
            );
            break;
          }

          case "mark_paid_manual": {
            if (registration.registrationStatus !== "paid") {
              const reference =
                parsed.reference ??
                `MANUAL-${Date.now()}-${String(registration._id).slice(-6).toUpperCase()}`;

              await paymentRepository.create(
                {
                  eventId: registration.eventId,
                  registrationId: registration._id,
                  vendorId: registration.vendorId,
                  gateway: "paystack",
                  gatewayReference: reference,
                  amountKobo: registration.amountKobo,
                  currency: registration.currency,
                  paymentStatus: "success",
                  paidAt: new Date(),
                  rawInitializeResponse: { manual: true },
                  rawVerifyResponse: { manual: true },
                },
                session,
              );

              await registrationRepository.updateById(
                registration._id,
                {
                  registrationStatus: "paid",
                  paidAt: new Date(),
                },
                session,
              );

              if (registration.standSlotId) {
                await standSlotRepository.updateById(
                  registration.standSlotId,
                  {
                    status: "paid",
                    heldUntil: undefined,
                  },
                  session,
                );
              }

              await auditLogRepository.create(
                {
                  eventId: String(registration.eventId),
                  actorType: "admin",
                  actorId,
                  action: "payment_verified",
                  entityType: "registration",
                  entityId: registration._id,
                  metadata: {
                    manual: true,
                    reference,
                  },
                },
                session,
              );
            }
            break;
          }

          case "correct_category": {
            const normalizedCategories = normalizeCategoryCodes(parsed.businessCategory);
            await registrationRepository.updateById(
              registration._id,
              {
                categories: normalizedCategories,
              },
              session,
            );

            await VendorModel.findByIdAndUpdate(
              registration.vendorId,
              {
                businessCategory: normalizedCategories,
              },
              { session },
            );

            await auditLogRepository.create(
              {
                eventId: String(registration.eventId),
                actorType: "admin",
                actorId,
                action: "category_corrected",
                entityType: "registration",
                entityId: registration._id,
                metadata: {
                  categories: normalizedCategories,
                },
              },
              session,
            );
            break;
          }

          default: {
            throw badRequest("Unsupported registration action.");
          }
        }
      });
    } finally {
      session.endSession();
    }

    return this.getRegistrationDetail(registrationId);
  },

  async listPayments(eventId: string, query: {
    page?: string | number;
    limit?: string | number;
    status?: PaymentStatus;
    fromDate?: string;
    toDate?: string;
    vendor?: string;
    reference?: string;
    channel?: string;
  }) {
    const eventObjectId = ensureObjectId(eventId, "eventId");
    const event = await tradefairEventRepository.findById(eventObjectId);
    if (!event) throw notFound("Event not found.");

    const pagination = parsePagination(query);

    const filter: Record<string, unknown> = { eventId: eventObjectId };
    if (query.status) filter.paymentStatus = query.status;
    if (query.reference) filter.gatewayReference = toRegex(query.reference);
    if (query.channel) filter.channel = toRegex(query.channel);

    if (query.fromDate || query.toDate) {
      filter.createdAt = {};
      if (query.fromDate) (filter.createdAt as Record<string, unknown>).$gte = new Date(query.fromDate);
      if (query.toDate) (filter.createdAt as Record<string, unknown>).$lte = new Date(query.toDate);
    }

    if (query.vendor) {
      const vendorRegex = toRegex(query.vendor);
      const vendors = await VendorModel.find({
        $or: [
          { firstName: vendorRegex },
          { lastName: vendorRegex },
          { brandName: vendorRegex },
          { phone: vendorRegex },
        ],
      })
        .select({ _id: 1 })
        .lean();
      filter.vendorId = { $in: vendors.map((vendor) => vendor._id) };
    }

    const [payments, total] = await Promise.all([
      PaymentModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      PaymentModel.countDocuments(filter),
    ]);

    const vendorIds = payments.map((payment) => payment.vendorId);
    const registrationIds = payments.map((payment) => payment.registrationId);

    const [vendors, registrations, stands, slots] = await Promise.all([
      VendorModel.find({ _id: { $in: vendorIds } }).lean(),
      RegistrationModel.find({ _id: { $in: registrationIds } }).lean(),
      StandModel.find({ eventId: eventObjectId }).lean(),
      StandSlotModel.find({ eventId: eventObjectId }).lean(),
    ]);

    const vendorMap = objectIdMap(vendors);
    const registrationMap = objectIdMap(registrations);
    const standMap = objectIdMap(stands);
    const slotMap = objectIdMap(slots);

    return {
      items: payments.map((payment) => {
        const registration = registrationMap[String(payment.registrationId)] ?? null;
        const vendor = vendorMap[String(payment.vendorId)] ?? null;
        const stand = registration
          ? standMap[String(registration.standId)] ?? null
          : null;
        const slot = registration?.standSlotId
          ? slotMap[String(registration.standSlotId)] ?? null
          : null;

        return {
          paymentId: String(payment._id),
          gateway: payment.gateway,
          reference: payment.gatewayReference,
          status: payment.paymentStatus,
          amountKobo: payment.amountKobo,
          currency: payment.currency,
          channel: payment.channel,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
          registration: registration
            ? {
                id: String(registration._id),
                bookingReference: registration.bookingReference,
                registrationStatus: registration.registrationStatus,
              }
            : null,
          vendor: vendor
            ? {
                id: String(vendor._id),
                firstName: vendor.firstName,
                lastName: vendor.lastName,
                phone: vendor.phone,
                brandName: vendor.brandName,
              }
            : null,
          stand: stand
            ? {
                id: String(stand._id),
                standCode: stand.standCode,
                label: stand.label,
                standType: stand.standType,
              }
            : null,
          slot: slot
            ? {
                id: String(slot._id),
                slotCode: slot.slotCode,
                slotLabel: slot.slotLabel,
              }
            : null,
        };
      }),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        pages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  },

  async listStands(eventId: string) {
    const eventObjectId = ensureObjectId(eventId, "eventId");
    const event = await tradefairEventRepository.findById(eventObjectId);
    if (!event) throw notFound("Event not found.");

    const [stands, slots, registrations, vendors] = await Promise.all([
      standRepository.findByEventId(eventObjectId),
      standSlotRepository.findByEventId(eventObjectId),
      RegistrationModel.find({
        eventId: eventObjectId,
        registrationStatus: { $in: ACTIVE_REGISTRATION_STATUSES },
      }).lean(),
      VendorModel.find({}).lean(),
    ]);

    const registrationsByStand = registrations.reduce<Record<string, typeof registrations>>(
      (acc, registration) => {
        const key = String(registration.standId);
        if (!acc[key]) acc[key] = [];
        acc[key].push(registration);
        return acc;
      },
      {},
    );

    const registrationsBySlot = registrations.reduce<Record<string, typeof registrations[0]>>(
      (acc, registration) => {
        if (registration.standSlotId) {
          acc[String(registration.standSlotId)] = registration;
        }
        return acc;
      },
      {},
    );

    const slotsByStand = slots.reduce<Record<string, typeof slots>>((acc, slot) => {
      const key = String(slot.standId);
      if (!acc[key]) acc[key] = [];
      acc[key].push(slot);
      return acc;
    }, {});

    const vendorMap = objectIdMap(vendors);

    const mappedStands = stands.map((stand) => {
      const standRegistrations = registrationsByStand[String(stand._id)] ?? [];
      const standSlots = slotsByStand[String(stand._id)] ?? [];

      const occupancyStatus = computeStandOccupancyStatus({
        standType: stand.standType,
        standBlocked: stand.isBlocked,
        standStatus: stand.status,
        standRegistrations,
        standSlots,
      });

      const slotsPayload = standSlots.map((slot) => {
        const registration = registrationsBySlot[String(slot._id)] ?? null;
        const vendor = registration ? vendorMap[String(registration.vendorId)] : null;

        return {
          id: String(slot._id),
          slotCode: slot.slotCode,
          slotLabel: slot.slotLabel,
          slotIndex: slot.slotIndex,
          status: slot.status,
          heldUntil: slot.heldUntil,
          slotPriceKobo: slot.slotPriceKobo,
          registration: registration
            ? {
                registrationId: String(registration._id),
                bookingReference: registration.bookingReference,
                status: registration.registrationStatus,
              }
            : null,
          vendor: vendor
            ? {
                id: String(vendor._id),
                firstName: vendor.firstName,
                lastName: vendor.lastName,
                brandName: vendor.brandName,
                phone: vendor.phone,
              }
            : null,
        };
      });

      return {
        id: String(stand._id),
        standCode: stand.standCode,
        label: stand.label,
        standType: stand.standType,
        status: stand.status,
        isBlocked: stand.isBlocked,
        capacity: stand.capacity,
        fullPriceKobo: stand.fullPriceKobo,
        occupancyStatus,
        slotCount: standSlots.length,
        occupiedSlots: standSlots.filter((slot) => slot.status === "paid").length,
        heldSlots: standSlots.filter((slot) => slot.status === "held").length,
        slots: slotsPayload,
      };
    });

    return {
      event: {
        id: String(event._id),
        slug: event.slug,
        name: event.name,
      },
      stands: mappedStands,
      slots: slots.map((slot) => ({
        id: String(slot._id),
        standId: String(slot.standId),
        slotCode: slot.slotCode,
        slotLabel: slot.slotLabel,
        slotIndex: slot.slotIndex,
        status: slot.status,
        heldUntil: slot.heldUntil,
      })),
    };
  },

  async updateStand(standId: string, payload: unknown, actorId: string) {
    const parsed = parseStandUpdatePayload(payload);
    const standObjectId = ensureObjectId(standId, "standId");

    const stand = await standRepository.findById(standObjectId);
    if (!stand) throw notFound("Stand not found.");

    const update: Record<string, unknown> = {};

    if (parsed.action === "block") {
      update.isBlocked = true;
    } else if (parsed.action === "unblock") {
      update.isBlocked = false;
    } else if (parsed.action === "disable") {
      update.status = "disabled";
    } else if (parsed.action === "hide") {
      update.status = "hidden";
    } else if (parsed.action === "activate") {
      update.status = "active";
    } else if (parsed.action === "update") {
      if (typeof parsed.fullPriceKobo === "number") {
        update.fullPriceKobo = parsed.fullPriceKobo;
      }
      if (typeof parsed.status === "string") {
        update.status = parsed.status;
      }
      if (typeof parsed.isBlocked === "boolean") {
        update.isBlocked = parsed.isBlocked;
      }
      if (parsed.metadata && typeof parsed.metadata === "object") {
        update.metadata = parsed.metadata;
      }
    }

    const updated = await standRepository.updateById(standId, update);
    if (!updated) throw notFound("Stand not found.");

    if (blockedStandActions.has(parsed.action)) {
      await auditLogRepository.create({
        eventId: String(updated.eventId),
        actorType: "admin",
        actorId,
        action: parsed.action === "block" ? "blocked_stand" : "unblocked_stand",
        entityType: "stand",
        entityId: updated._id,
        metadata: {
          standId,
          standCode: updated.standCode,
        },
      });
    }

    return updated;
  },

  async updateSlot(slotId: string, payload: unknown, actorId: string) {
    const parsed = parseSlotUpdatePayload(payload);
    const slotObjectId = ensureObjectId(slotId, "slotId");

    const slot = await standSlotRepository.findById(slotObjectId);
    if (!slot) throw notFound("Stand slot not found.");

    const update: Record<string, unknown> = {};

    if (parsed.action === "block") {
      update.status = "blocked";
    } else if (parsed.action === "unblock") {
      if (slot.status === "paid") {
        throw conflict("Paid slot cannot be unblocked to available directly.");
      }
      update.status = "available";
      update.heldUntil = undefined;
      update.vendorSnapshot = undefined;
    } else if (parsed.action === "set_status") {
      if (!parsed.status) throw badRequest("status is required for set_status action.");
      if (parsed.status === "available") {
        const paidCount = await RegistrationModel.countDocuments({
          standSlotId: slotObjectId,
          registrationStatus: "paid",
        });
        if (paidCount > 0) {
          throw conflict("Cannot set slot to available while a paid registration exists.");
        }
      }
      update.status = parsed.status;
      if (parsed.status === "available") {
        update.heldUntil = undefined;
        update.vendorSnapshot = undefined;
      }
    } else if (parsed.action === "update_snapshot") {
      update.vendorSnapshot = parsed.vendorSnapshot ?? undefined;
    }

    const updated = await standSlotRepository.updateById(slotId, update);
    if (!updated) throw notFound("Stand slot not found.");

    if (blockedSlotActions.has(parsed.action)) {
      await auditLogRepository.create({
        eventId: String(updated.eventId),
        actorType: "admin",
        actorId,
        action: parsed.action === "block" ? "blocked_slot" : "unblocked_slot",
        entityType: "slot",
        entityId: updated._id,
        metadata: {
          slotId,
          slotCode: updated.slotCode,
        },
      });
    }

    return updated;
  },

  async listCategories(eventId: string) {
    const eventObjectId = ensureObjectId(eventId, "eventId");
    const event = await tradefairEventRepository.findById(eventObjectId);
    if (!event) throw notFound("Event not found.");

    const [categories, usageRows] = await Promise.all([
      categoryRepository.listByEvent(eventObjectId),
      RegistrationModel.aggregate<{ _id: string; usage: number }>([
        {
          $match: {
            eventId: eventObjectId,
            registrationStatus: { $in: ACTIVE_REGISTRATION_STATUSES },
          },
        },
        { $unwind: "$categories" },
        { $group: { _id: "$categories", usage: { $sum: 1 } } },
      ]),
    ]);

    const usageMap = usageRows.reduce<Record<string, number>>((acc, row) => {
      acc[row._id] = row.usage;
      return acc;
    }, {});

    return categories.map((category) => ({
      id: String(category._id),
      code: category.code,
      name: category.name,
      isOpen: category.isOpen,
      limit: category.limit,
      priceOverrideKobo: category.priceOverrideKobo,
      isArchived: category.isArchived,
      usage: usageMap[category.code] ?? 0,
    }));
  },

  async updateCategory(eventId: string, categoryId: string, payload: unknown, actorId: string) {
    ensureObjectId(eventId, "eventId");
    const categoryObjectId = ensureObjectId(categoryId, "categoryId");

    const parsed = categoryUpdateSchema.parse(payload);
    const category = await categoryRepository.findById(categoryObjectId);
    if (!category) throw notFound("Category not found.");
    if (String(category.eventId) !== String(eventId)) {
      throw conflict("Category does not belong to provided event.");
    }

    const updated = await categoryRepository.updateById(categoryId, parsed);
    if (!updated) throw notFound("Category not found.");

    await auditLogRepository.create({
      eventId,
      actorType: "admin",
      actorId,
      action: "category_rule_changed",
      entityType: "category",
      entityId: updated._id,
      metadata: parsed,
    });

    return updated;
  },
};
