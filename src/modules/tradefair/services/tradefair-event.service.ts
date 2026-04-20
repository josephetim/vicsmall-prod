import { notFound } from "@/backend/utils/http-error";
import { paymentRepository } from "@/modules/tradefair/repositories/payment.repository";
import { registrationRepository } from "@/modules/tradefair/repositories/registration.repository";
import { standRepository } from "@/modules/tradefair/repositories/stand.repository";
import { standSlotRepository } from "@/modules/tradefair/repositories/stand-slot.repository";
import { tradefairEventRepository } from "@/modules/tradefair/repositories/tradefair-event.repository";

export const tradefairEventService = {
  async getSummaryBySlug(slug: string) {
    const event = await tradefairEventRepository.findBySlug(slug);
    if (!event) throw notFound("Tradefair event not found.");

    const [stands, slots, registrations, payments] = await Promise.all([
      standRepository.findByEventId(event._id),
      standSlotRepository.findByEventId(event._id),
      registrationRepository.listByEvent(String(event._id), {
        page: 1,
        limit: 10000,
      }),
      paymentRepository.listByEvent(String(event._id), { page: 1, limit: 10000 }),
    ]);

    const paidRegistrations = registrations.items.filter(
      (row) => row.registrationStatus === "paid",
    );

    const premiumTotal = stands.filter((stand) => stand.standType === "premium").length;
    const singleTotal = stands.filter((stand) => stand.standType === "single").length;
    const sharedSlotTotal = slots.length;

    const premiumSold = paidRegistrations.filter((row) => row.standType === "premium").length;
    const singleSold = paidRegistrations.filter((row) => row.standType === "single").length;
    const sharedSold = paidRegistrations.filter((row) => row.standType === "shared").length;

    const totalLeft = premiumTotal - premiumSold + singleTotal - singleSold + sharedSlotTotal - sharedSold;
    const totalRevenueKobo = payments.items
      .filter((item) => item.paymentStatus === "success")
      .reduce((sum, item) => sum + Number(item.amountKobo), 0);

    return {
      id: String(event._id),
      slug: event.slug,
      name: event.name,
      venue: event.venue,
      eventDate: event.eventDate.toISOString(),
      status: event.status,
      prices: {
        premium: event.prices.premiumKobo,
        single: event.prices.singleKobo,
        sharedCanopy: event.prices.sharedCanopyKobo,
        sharedSlot: event.prices.sharedSlotKobo,
      },
      counts: {
        premiumLeft: Math.max(0, premiumTotal - premiumSold),
        singleLeft: Math.max(0, singleTotal - singleSold),
        sharedSlotsLeft: Math.max(0, sharedSlotTotal - sharedSold),
        totalLeft: Math.max(0, totalLeft),
      },
      supportContact: {
        whatsapp: event.supportContact.whatsapp,
        phone: event.supportContact.phone,
        email: event.supportContact.email,
      },
      registrationState: {
        open: event.status === "live",
        opensAt: event.registrationOpenAt?.toISOString() ?? null,
        closesAt: event.registrationCloseAt?.toISOString() ?? null,
      },
      metrics: {
        revenueKobo: totalRevenueKobo,
      },
    };
  },
};
