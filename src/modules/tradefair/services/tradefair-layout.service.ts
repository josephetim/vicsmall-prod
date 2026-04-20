import { notFound } from "@/backend/utils/http-error";
import { registrationRepository } from "@/modules/tradefair/repositories/registration.repository";
import { standRepository } from "@/modules/tradefair/repositories/stand.repository";
import { standSlotRepository } from "@/modules/tradefair/repositories/stand-slot.repository";
import { tradefairEventRepository } from "@/modules/tradefair/repositories/tradefair-event.repository";
import type { RegistrationStatus } from "@/modules/tradefair/types/backend.types";

const ACTIVE_STATUSES: RegistrationStatus[] = ["held", "pending_payment", "paid"];

export const tradefairLayoutService = {
  async getLayoutBySlug(slug: string) {
    const event = await tradefairEventRepository.findBySlug(slug);
    if (!event) throw notFound("Tradefair event not found.");

    const [stands, slots, activeRegistrationsPage] = await Promise.all([
      standRepository.findByEventId(event._id),
      standSlotRepository.findByEventId(event._id),
      registrationRepository.listByEvent(String(event._id), { page: 1, limit: 10000 }),
    ]);

    const activeRegistrations = activeRegistrationsPage.items.filter((registration) =>
      ACTIVE_STATUSES.includes(registration.registrationStatus),
    );

    const registrationByStandId = activeRegistrations.reduce<Record<string, number>>(
      (acc, row) => {
        const key = String(row.standId);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {},
    );

    const paidByStandSlotId = activeRegistrations.reduce<Record<string, boolean>>(
      (acc, row) => {
        if (row.standSlotId && row.registrationStatus === "paid") {
          acc[String(row.standSlotId)] = true;
        }
        return acc;
      },
      {},
    );

    const mappedStands = stands.map((stand) => {
      const activeCount = registrationByStandId[String(stand._id)] ?? 0;
      const status =
        stand.isBlocked || stand.status !== "active"
          ? "blocked"
          : stand.standType === "shared"
            ? "active"
            : activeCount > 0
              ? "held"
              : "available";

      return {
        id: String(stand._id),
        standCode: stand.standCode,
        label: stand.label,
        standType: stand.standType,
        columnNo: stand.columnNo,
        rowNo: stand.rowNo,
        capacity: stand.capacity,
        fullPriceKobo: stand.fullPriceKobo,
        status,
      };
    });

    const mappedSlots = slots.map((slot) => {
      const status = paidByStandSlotId[String(slot._id)] ? "paid" : slot.status;
      return {
        id: String(slot._id),
        standId: String(slot.standId),
        slotCode: slot.slotCode,
        slotLabel: slot.slotLabel,
        slotIndex: slot.slotIndex,
        slotPriceKobo: slot.slotPriceKobo,
        status,
      };
    });

    return {
      event: {
        id: String(event._id),
        slug: event.slug,
        name: event.name,
        venue: event.venue,
        eventDate: event.eventDate.toISOString(),
        status: event.status,
      },
      field: event.fieldMeta,
      premium: mappedStands.filter((row) => row.standType === "premium"),
      single: mappedStands.filter((row) => row.standType === "single"),
      shared: mappedStands.filter((row) => row.standType === "shared"),
      slots: mappedSlots,
      features: {
        gatePosition: event.fieldMeta.gatePosition,
        vicsmallStand: "top-left",
        photoBooth: "top-left",
        stage: "top",
        fence: true,
        walkway: event.fieldMeta.walkwayStyle,
      },
    };
  },
};
