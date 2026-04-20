import mongoose from "mongoose";

import { badRequest, conflict, notFound } from "@/backend/utils/http-error";
import type { CreateHoldResponseDto } from "@/modules/tradefair/dto/create-hold.dto";
import { createHoldSchema } from "@/modules/tradefair/validators/create-hold.validator";
import { buildBookingReference } from "@/modules/tradefair/utils/booking-reference";
import {
  assertAllCategoriesOpenAndWithinLimit,
  normalizeCategoryCodes,
} from "@/modules/tradefair/utils/category-counting";
import { resolveSlotPriceKobo } from "@/modules/tradefair/utils/slot-pricing";
import { auditLogRepository } from "@/modules/tradefair/repositories/audit-log.repository";
import { categoryRepository } from "@/modules/tradefair/repositories/category.repository";
import { paymentRepository } from "@/modules/tradefair/repositories/payment.repository";
import { registrationRepository } from "@/modules/tradefair/repositories/registration.repository";
import { standRepository } from "@/modules/tradefair/repositories/stand.repository";
import { standSlotRepository } from "@/modules/tradefair/repositories/stand-slot.repository";
import { tradefairCategoryService } from "@/modules/tradefair/services/tradefair-category.service";
import { tradefairEventRepository } from "@/modules/tradefair/repositories/tradefair-event.repository";
import { vendorRepository } from "@/modules/tradefair/repositories/vendor.repository";

export const tradefairRegistrationService = {
  async createHold(slug: string, payload: unknown): Promise<CreateHoldResponseDto> {
    const parsed = createHoldSchema.parse(payload);
    const session = await mongoose.startSession();
    const holdMinutes = Number(process.env.TRADEFAIR_HOLD_MINUTES ?? 20);

    try {
      return await session.withTransaction(async () => {
        const event = await tradefairEventRepository.findBySlug(slug);
        if (!event) throw notFound("Tradefair event not found.");
        if (event.status !== "live") {
          throw conflict("Tradefair registration is not open.");
        }
        if (event.registrationOpenAt && event.registrationOpenAt > new Date()) {
          throw conflict("Registration window has not opened yet.");
        }
        if (event.registrationCloseAt && event.registrationCloseAt < new Date()) {
          throw conflict("Registration window is closed.");
        }

        const stand = await standRepository.findByIdForUpdate(parsed.standId, session);
        if (!stand || String(stand.eventId) !== String(event._id)) {
          throw notFound("Selected stand was not found for this event.");
        }
        if (stand.isBlocked || stand.status !== "active") {
          throw conflict("Selected stand is blocked or unavailable.");
        }

        const normalizedCategories = normalizeCategoryCodes(parsed.businessCategory);
        const categoryRows = await categoryRepository.listByEvent(String(event._id));
        const categoryUsageMap = await tradefairCategoryService.getUsageMap(
          String(event._id),
          normalizedCategories,
        );

        assertAllCategoriesOpenAndWithinLimit({
          selectedCategoryCodes: normalizedCategories,
          categories: categoryRows,
          categoryUsageMap,
        });

        let slot = null as Awaited<ReturnType<typeof standSlotRepository.findById>> | null;
        if (stand.standType === "shared") {
          if (!parsed.standSlotId) {
            throw badRequest("standSlotId is required for shared stand selection.");
          }

          slot = await standSlotRepository.findById(parsed.standSlotId);
          if (!slot || String(slot.standId) !== String(stand._id)) {
            throw notFound("Selected shared slot was not found.");
          }

          const heldSlot = await standSlotRepository.holdSlotAtomically(
            parsed.standSlotId,
            new Date(Date.now() + holdMinutes * 60 * 1000),
            {
              vendorName: `${parsed.firstName} ${parsed.lastName}`,
              brandName: parsed.brandName,
            },
            session,
          );
          if (!heldSlot) {
            throw conflict("Selected shared slot is no longer available.");
          }
          slot = heldSlot;
        } else {
          const existingActive = await registrationRepository.findByStandIdWithActiveStatuses(
            parsed.standId,
            session,
          );
          if (existingActive) {
            throw conflict("Selected stand is no longer available.");
          }
        }

        const vendor = await vendorRepository.findOrCreateByPhoneAndBrand(
          {
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            phone: parsed.phone,
            email: parsed.email,
            brandName: parsed.brandName,
            businessCategory: normalizedCategories,
            standPreferences: parsed.standPreferences,
          },
          session,
        );

        const amountKobo = resolveSlotPriceKobo({
          stand,
          categories: categoryRows.filter((row) =>
            normalizedCategories.includes(row.code),
          ),
        });
        const holdExpiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);
        const bookingReference = buildBookingReference();

        const registration = await registrationRepository.create(
          {
            eventId: event._id,
            vendorId: vendor._id,
            standId: stand._id,
            standSlotId: slot?._id,
            standType: stand.standType,
            bookingReference,
            amountKobo,
            currency: event.currency,
            registrationStatus: "held",
            termsAccepted: parsed.termsAccepted,
            termsAcceptedAt: new Date(),
            holdExpiresAt,
            paymentDueAt: holdExpiresAt,
            categories: normalizedCategories,
            notes: "",
          },
          session,
        );

        await auditLogRepository.create(
          {
            eventId: String(event._id),
            actorType: "vendor",
            actorId: String(vendor._id),
            action: "created_hold",
            entityType: "registration",
            entityId: String(registration._id),
            metadata: {
              standId: String(stand._id),
              slotId: slot ? String(slot._id) : null,
              bookingReference,
            },
          },
          session,
        );

        return {
          registrationId: String(registration._id),
          bookingReference,
          amountKobo,
          holdExpiresAt: holdExpiresAt.toISOString(),
          stand: {
            id: String(stand._id),
            standCode: stand.standCode,
            label: stand.label,
            standType: stand.standType,
          },
          slot: slot
            ? {
                id: String(slot._id),
                slotCode: slot.slotCode,
                slotLabel: slot.slotLabel,
                slotIndex: slot.slotIndex,
              }
            : undefined,
        };
      });
    } finally {
      session.endSession();
    }
  },

  async getConfirmation(bookingReference: string) {
    const registration = await registrationRepository.findByBookingReference(
      bookingReference,
    );
    if (!registration) {
      throw notFound("Registration not found for booking reference.");
    }

    const [vendor, stand, slot, payments, event] = await Promise.all([
      vendorRepository.findById(registration.vendorId),
      standRepository.findById(registration.standId),
      registration.standSlotId
        ? standSlotRepository.findById(registration.standSlotId)
        : Promise.resolve(null),
      paymentRepository.listByEvent(String(registration.eventId), {
        page: 1,
        limit: 100,
      }),
      tradefairEventRepository.findById(registration.eventId),
    ]);

    if (!vendor || !stand || !event) {
      throw notFound("Registration confirmation resources are incomplete.");
    }

    const payment = payments.items.find(
      (row) => String(row.registrationId) === String(registration._id),
    );

    return {
      bookingReference: registration.bookingReference,
      vendor: {
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        phone: vendor.phone,
        email: vendor.email,
        brandName: vendor.brandName,
        categories: vendor.businessCategory,
      },
      stand: {
        standCode: stand.standCode,
        label: stand.label,
        standType: stand.standType,
      },
      slot: slot
        ? {
            slotCode: slot.slotCode,
            slotLabel: slot.slotLabel,
            slotIndex: slot.slotIndex,
          }
        : null,
      amountPaidKobo: registration.amountKobo,
      paymentStatus: payment?.paymentStatus ?? "pending",
      gatewayReference: payment?.gatewayReference ?? null,
      paidAt: payment?.paidAt ?? registration.paidAt ?? null,
      supportContact: {
        whatsapp: event.supportContact.whatsapp,
        phone: event.supportContact.phone,
        email: event.supportContact.email,
      },
    };
  },
};
