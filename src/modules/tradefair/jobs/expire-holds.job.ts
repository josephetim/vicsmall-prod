import mongoose from "mongoose";

import { auditLogRepository } from "@/modules/tradefair/repositories/audit-log.repository";
import { registrationRepository } from "@/modules/tradefair/repositories/registration.repository";
import { standSlotRepository } from "@/modules/tradefair/repositories/stand-slot.repository";
import { RegistrationModel } from "@/modules/tradefair/models/Registration";

export async function expireHoldsJob() {
  const now = new Date();
  const stale = await registrationRepository.findExpiredActiveHolds(now);
  let expiredCount = 0;
  let releasedSlotCount = 0;

  for (const row of stale) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const registration = await registrationRepository.findByIdForUpdate(
          row._id,
          session,
        );
        if (!registration) return;

        const stillExpirable =
          ["held", "pending_payment"].includes(registration.registrationStatus) &&
          registration.holdExpiresAt &&
          registration.holdExpiresAt < now;

        if (!stillExpirable) return;

        await registrationRepository.updateById(
          registration._id,
          {
            registrationStatus: "expired",
          },
          session,
        );
        expiredCount += 1;

        if (registration.standSlotId) {
          const paidCount = await RegistrationModel.countDocuments({
            eventId: registration.eventId,
            standSlotId: registration.standSlotId,
            registrationStatus: "paid",
          }).session(session);

          if (paidCount === 0) {
            await standSlotRepository.updateById(
              registration.standSlotId,
              {
                status: "available",
                heldUntil: undefined,
                vendorSnapshot: undefined,
              },
              session,
            );
            releasedSlotCount += 1;
          }
        }

        await auditLogRepository.create(
          {
            eventId: String(registration.eventId),
            actorType: "system",
            action: "hold_expired",
            entityType: "registration",
            entityId: registration._id,
            metadata: {
              standId: String(registration.standId),
              standSlotId: registration.standSlotId
                ? String(registration.standSlotId)
                : null,
              bookingReference: registration.bookingReference,
            },
          },
          session,
        );
      });
    } finally {
      session.endSession();
    }
  }

  return {
    scanned: stale.length,
    expiredCount,
    releasedSlotCount,
  };
}
