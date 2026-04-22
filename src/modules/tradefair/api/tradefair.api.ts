import { buildApiUrl } from "@/lib/api-base-url";
import type {
  CreateHoldPayload,
  CreateHoldResponse,
  EventSummary,
  PaymentInitializationResponse,
  PaymentVerificationResponse,
  TradefairConfirmation,
  TradefairLayout,
} from "@/modules/tradefair/types/tradefair.types";

type ApiEnvelope<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error?: { message?: string } };

const EVENT_SLUG =
  process.env.NEXT_PUBLIC_TRADEFAIR_EVENT_SLUG ?? "iuo-2026-tradefair";

function getErrorMessage(payload: ApiEnvelope<unknown> | null, fallback: string) {
  if (payload && "success" in payload && !payload.success) {
    return payload.error?.message ?? fallback;
  }
  return fallback;
}

async function requestBackend<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload || !("success" in payload) || !payload.success) {
    throw new Error(getErrorMessage(payload, "Unable to complete tradefair request."));
  }

  return payload.data;
}

export async function getTradefairEvent(): Promise<EventSummary> {
  const data = await requestBackend<{
    id: string;
    slug: string;
    name: string;
    venue: string;
    eventDate: string;
    status: "draft" | "live" | "closed" | "archived";
    supportContact: {
      whatsapp: string;
      phone?: string;
      email?: string;
    };
    shortDescription?: string | null;
    bannerText?: string | null;
    registrationStatusText?: string | null;
    publicHelperText?: string | null;
    displayLabels?: {
      photoBoothLabel?: string | null;
      vicsmallStandLabel?: string | null;
      stageLabel?: string | null;
    };
  }>(`/api/tradefair/events/${EVENT_SLUG}`);

  const eventDate = new Date(data.eventDate);
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    venue: data.venue,
    dateLabel: Number.isNaN(eventDate.getTime())
      ? data.eventDate
      : eventDate.toLocaleDateString("en-NG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
    holdMinutes: Number(process.env.NEXT_PUBLIC_TRADEFAIR_HOLD_MINUTES ?? 20),
    status: data.status,
    supportContact: data.supportContact ?? { whatsapp: "" },
    shortDescription: data.shortDescription ?? undefined,
    bannerText: data.bannerText ?? undefined,
    registrationStatusText: data.registrationStatusText ?? undefined,
    publicHelperText: data.publicHelperText ?? undefined,
    displayLabels: data.displayLabels
      ? {
          photoBoothLabel: data.displayLabels.photoBoothLabel ?? undefined,
          vicsmallStandLabel: data.displayLabels.vicsmallStandLabel ?? undefined,
          stageLabel: data.displayLabels.stageLabel ?? undefined,
        }
      : undefined,
  };
}

export async function getTradefairLayout(): Promise<TradefairLayout> {
  const data = await requestBackend<{
    premium: Array<{
      id: string;
      label: string;
      standType: "premium";
      fullPriceKobo: number;
      capacity: number;
      columnNo: number;
      rowNo: number;
    }>;
    single: Array<{
      id: string;
      label: string;
      standType: "single";
      fullPriceKobo: number;
      capacity: number;
      columnNo: number;
      rowNo: number;
    }>;
    shared: Array<{
      id: string;
      label: string;
      standType: "shared";
      fullPriceKobo: number;
      capacity: number;
      columnNo: number;
      rowNo: number;
    }>;
    slots: Array<{
      id: string;
      standId: string;
      slotLabel: string;
      status: "available" | "held" | "paid" | "blocked";
    }>;
  }>(`/api/tradefair/events/${EVENT_SLUG}/layout`);

  const mapStand = (
    stand: {
      id: string;
      label: string;
      standType: "premium" | "single" | "shared";
      fullPriceKobo: number;
      capacity: number;
      columnNo: number;
      rowNo: number;
    },
    occupied: number,
  ) => ({
    id: stand.id,
    label: stand.label,
    type: stand.standType,
    price: Math.round(stand.fullPriceKobo / 100),
    capacity: stand.capacity,
    occupied,
    column: String(stand.columnNo),
    row: stand.rowNo,
  });

  const shared = data.shared.map((stand) => {
    const slots = data.slots
      .filter((slot) => slot.standId === stand.id)
      .map((slot) => ({
        id: slot.id,
        label: slot.slotLabel,
        occupied: slot.status !== "available",
        vendorName: slot.status === "available" ? "" : "Reserved",
      }));

    return {
      ...mapStand(
        stand,
        slots.filter((slot) => slot.occupied).length,
      ),
      slots,
    };
  });

  return {
    premium: data.premium.map((stand) => mapStand(stand, 0)),
    single: data.single.map((stand) => mapStand(stand, 0)),
    shared,
  };
}

export async function createHold(
  payload: CreateHoldPayload,
): Promise<CreateHoldResponse> {
  const data = await requestBackend<{
    registrationId: string;
    bookingReference: string;
    amountKobo: number;
    holdExpiresAt: string;
  }>(`/api/tradefair/events/${EVENT_SLUG}/registrations/hold`, {
    method: "POST",
    body: JSON.stringify({
      firstName: payload.vendor.firstName,
      lastName: payload.vendor.lastName,
      phone: payload.vendor.phone,
      email: payload.vendor.email?.trim() ? payload.vendor.email.trim() : undefined,
      brandName: payload.vendor.brandName,
      businessCategory: payload.vendor.categories,
      standPreferences: payload.vendor.preferences,
      standId: payload.standId,
      standSlotId: payload.slotId,
      termsAccepted: payload.vendor.agree,
    }),
  });

  return {
    reservationId: data.registrationId,
    bookingReference: data.bookingReference,
    amountKobo: data.amountKobo,
    holdUntil: data.holdExpiresAt,
    status: "held",
  };
}

export async function initializePayment(
  reservationId: string,
): Promise<PaymentInitializationResponse> {
  const data = await requestBackend<{
    authorization_url: string;
    access_code?: string;
    reference: string;
  }>(`/api/tradefair/registrations/${reservationId}/payments/initialize`, {
    method: "POST",
  });

  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference,
  };
}

export async function verifyPayment(
  reference: string,
): Promise<PaymentVerificationResponse> {
  const data = await requestBackend<{
    ok?: boolean;
    status: "success" | "failed" | "pending" | "abandoned";
    bookingReference?: string;
    alreadyVerified?: boolean;
  }>("/api/tradefair/payments/verify", {
    method: "POST",
    body: JSON.stringify({ reference }),
  });

  const normalizedStatus: PaymentVerificationResponse["status"] =
    data.status === "abandoned" ? "failed" : data.status;

  return {
    bookingReference: data.bookingReference,
    reference,
    status: normalizedStatus,
    alreadyVerified: data.alreadyVerified ?? false,
  };
}

export async function getConfirmation(
  bookingReference: string,
): Promise<TradefairConfirmation> {
  const data = await requestBackend<{
    bookingReference: string;
    amountPaidKobo: number;
    paymentStatus:
      | "initialized"
      | "pending"
      | "success"
      | "failed"
      | "abandoned"
      | "refunded";
    gatewayReference: string | null;
    paidAt: string | null;
    vendor: {
      firstName: string;
      lastName: string;
      phone: string;
      email?: string;
      brandName: string;
      categories: string[];
    };
    stand: {
      standCode: string;
      label: string;
      standType: "premium" | "single" | "shared";
    };
    slot: {
      slotCode: string;
      slotLabel: string;
      slotIndex: number;
    } | null;
    supportContact: {
      whatsapp: string;
      phone?: string;
      email?: string;
    };
  }>(`/api/tradefair/registrations/${bookingReference}/confirmation`);

  return {
    bookingReference: data.bookingReference,
    paymentStatus: data.paymentStatus,
    gatewayReference: data.gatewayReference,
    paidAt: data.paidAt,
    amountPaidKobo: data.amountPaidKobo,
    vendor: data.vendor,
    stand: data.stand,
    slot: data.slot,
    supportContact: data.supportContact,
  };
}
