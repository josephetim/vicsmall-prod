import { badRequest } from "@/backend/utils/http-error";
import { ensureObjectId } from "@/backend/utils/mongo";
import { paymentRepository } from "@/modules/tradefair/repositories/payment.repository";
import { registrationRepository } from "@/modules/tradefair/repositories/registration.repository";
import { standRepository } from "@/modules/tradefair/repositories/stand.repository";
import { standSlotRepository } from "@/modules/tradefair/repositories/stand-slot.repository";
import { vendorRepository } from "@/modules/tradefair/repositories/vendor.repository";
import { tradefairAdminService } from "@/modules/tradefair/services/tradefair-admin.service";

type ExportFormat = "csv" | "json";

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
    return `"${raw.replace(/"/g, "\"\"")}"`;
  }
  return raw;
}

function toCsv(headers: string[], rows: Array<Record<string, unknown>>) {
  const headerLine = headers.map((header) => escapeCsv(header)).join(",");
  const bodyLines = rows.map((row) =>
    headers.map((header) => escapeCsv(row[header])).join(","),
  );
  return [headerLine, ...bodyLines].join("\n");
}

function normalizeExportFormat(value: unknown): ExportFormat {
  if (!value) return "csv";
  if (value === "csv" || value === "json") return value;
  throw badRequest("Invalid export format. Use csv or json.");
}

export const tradefairExportService = {
  async exportRegistrations(eventId: string, formatValue?: unknown) {
    ensureObjectId(eventId, "eventId");
    const format = normalizeExportFormat(formatValue);

    const registrations = await registrationRepository.listByEvent(eventId, {
      page: 1,
      limit: 10000,
    });

    const vendorIds = registrations.items.map((item) => item.vendorId);
    const standIds = registrations.items.map((item) => item.standId);
    const slotIds = registrations.items
      .map((item) => item.standSlotId)
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const [vendors, stands, slots] = await Promise.all([
      Promise.all(vendorIds.map((id) => vendorRepository.findById(id))),
      Promise.all(standIds.map((id) => standRepository.findById(id))),
      Promise.all(slotIds.map((id) => standSlotRepository.findById(id))),
    ]);

    const vendorMap = vendors.reduce<Record<string, NonNullable<(typeof vendors)[number]>>>(
      (acc, vendor) => {
        if (vendor) acc[String(vendor._id)] = vendor;
        return acc;
      },
      {},
    );
    const standMap = stands.reduce<Record<string, NonNullable<(typeof stands)[number]>>>(
      (acc, stand) => {
        if (stand) acc[String(stand._id)] = stand;
        return acc;
      },
      {},
    );
    const slotMap = slots.reduce<Record<string, NonNullable<(typeof slots)[number]>>>(
      (acc, slot) => {
        if (slot) acc[String(slot._id)] = slot;
        return acc;
      },
      {},
    );

    const rows = registrations.items.map((registration) => {
      const vendor = vendorMap[String(registration.vendorId)];
      const stand = standMap[String(registration.standId)];
      const slot = registration.standSlotId
        ? slotMap[String(registration.standSlotId)]
        : null;
      return {
        registrationId: String(registration._id),
        bookingReference: registration.bookingReference,
        registrationStatus: registration.registrationStatus,
        standType: registration.standType,
        standCode: stand?.standCode ?? "",
        standLabel: stand?.label ?? "",
        slotCode: slot?.slotCode ?? "",
        slotLabel: slot?.slotLabel ?? "",
        amountKobo: registration.amountKobo,
        currency: registration.currency,
        firstName: vendor?.firstName ?? "",
        lastName: vendor?.lastName ?? "",
        phone: vendor?.phone ?? "",
        email: vendor?.email ?? "",
        brandName: vendor?.brandName ?? "",
        categories: registration.categories.join("|"),
        createdAt: registration.createdAt?.toISOString?.() ?? "",
      };
    });

    const headers = [
      "registrationId",
      "bookingReference",
      "registrationStatus",
      "standType",
      "standCode",
      "standLabel",
      "slotCode",
      "slotLabel",
      "amountKobo",
      "currency",
      "firstName",
      "lastName",
      "phone",
      "email",
      "brandName",
      "categories",
      "createdAt",
    ];

    if (format === "json") {
      return {
        format,
        filename: `tradefair-registrations-${eventId}.json`,
        data: rows,
      };
    }

    return {
      format,
      filename: `tradefair-registrations-${eventId}.csv`,
      data: toCsv(headers, rows),
    };
  },

  async exportPayments(eventId: string, formatValue?: unknown) {
    ensureObjectId(eventId, "eventId");
    const format = normalizeExportFormat(formatValue);

    const payments = await paymentRepository.listByEvent(eventId, {
      page: 1,
      limit: 10000,
    });

    const vendorIds = payments.items.map((item) => item.vendorId);
    const registrationIds = payments.items.map((item) => item.registrationId);

    const [vendors, registrations] = await Promise.all([
      Promise.all(vendorIds.map((id) => vendorRepository.findById(id))),
      Promise.all(registrationIds.map((id) => registrationRepository.findById(id))),
    ]);

    const vendorMap = vendors.reduce<Record<string, NonNullable<(typeof vendors)[number]>>>(
      (acc, vendor) => {
        if (vendor) acc[String(vendor._id)] = vendor;
        return acc;
      },
      {},
    );
    const registrationMap = registrations.reduce<
      Record<string, NonNullable<(typeof registrations)[number]>>
    >((acc, registration) => {
      if (registration) acc[String(registration._id)] = registration;
      return acc;
    }, {});

    const rows = payments.items.map((payment) => {
      const vendor = vendorMap[String(payment.vendorId)];
      const registration = registrationMap[String(payment.registrationId)];
      return {
        paymentId: String(payment._id),
        registrationId: registration ? String(registration._id) : "",
        bookingReference: registration?.bookingReference ?? "",
        paymentStatus: payment.paymentStatus,
        gateway: payment.gateway,
        reference: payment.gatewayReference,
        amountKobo: payment.amountKobo,
        currency: payment.currency,
        channel: payment.channel ?? "",
        firstName: vendor?.firstName ?? "",
        lastName: vendor?.lastName ?? "",
        phone: vendor?.phone ?? "",
        brandName: vendor?.brandName ?? "",
        paidAt: payment.paidAt?.toISOString?.() ?? "",
        createdAt: payment.createdAt?.toISOString?.() ?? "",
      };
    });

    const headers = [
      "paymentId",
      "registrationId",
      "bookingReference",
      "paymentStatus",
      "gateway",
      "reference",
      "amountKobo",
      "currency",
      "channel",
      "firstName",
      "lastName",
      "phone",
      "brandName",
      "paidAt",
      "createdAt",
    ];

    if (format === "json") {
      return {
        format,
        filename: `tradefair-payments-${eventId}.json`,
        data: rows,
      };
    }

    return {
      format,
      filename: `tradefair-payments-${eventId}.csv`,
      data: toCsv(headers, rows),
    };
  },

  async exportStands(eventId: string, formatValue?: unknown) {
    ensureObjectId(eventId, "eventId");
    const format = normalizeExportFormat(formatValue);

    const standState = await tradefairAdminService.listStands(eventId);

    const rows = standState.stands.flatMap((stand) => {
      if (stand.standType !== "shared" || stand.slots.length === 0) {
        return [
          {
            standId: stand.id,
            standCode: stand.standCode,
            standLabel: stand.label,
            standType: stand.standType,
            standStatus: stand.status,
            blocked: stand.isBlocked,
            occupancyStatus: stand.occupancyStatus,
            slotCode: "",
            slotLabel: "",
            slotStatus: "",
            slotHeldUntil: "",
          },
        ];
      }

      return stand.slots.map((slot) => ({
        standId: stand.id,
        standCode: stand.standCode,
        standLabel: stand.label,
        standType: stand.standType,
        standStatus: stand.status,
        blocked: stand.isBlocked,
        occupancyStatus: stand.occupancyStatus,
        slotCode: slot.slotCode,
        slotLabel: slot.slotLabel,
        slotStatus: slot.status,
        slotHeldUntil: slot.heldUntil ? new Date(slot.heldUntil).toISOString() : "",
      }));
    });

    const headers = [
      "standId",
      "standCode",
      "standLabel",
      "standType",
      "standStatus",
      "blocked",
      "occupancyStatus",
      "slotCode",
      "slotLabel",
      "slotStatus",
      "slotHeldUntil",
    ];

    if (format === "json") {
      return {
        format,
        filename: `tradefair-stands-${eventId}.json`,
        data: {
          event: standState.event,
          rows,
        },
      };
    }

    return {
      format,
      filename: `tradefair-stands-${eventId}.csv`,
      data: toCsv(headers, rows),
    };
  },
};
