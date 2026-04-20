import { buildApiUrl } from "@/lib/api-base-url";
import type {
  CreateHoldPayload,
  CreateHoldResponse,
  EventSummary,
  PaymentInitializationResponse,
  PaymentVerificationResponse,
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
    holdExpiresAt: string;
  }>(`/api/tradefair/events/${EVENT_SLUG}/registrations/hold`, {
    method: "POST",
    body: JSON.stringify({
      firstName: payload.vendor.firstName,
      lastName: payload.vendor.lastName,
      phone: payload.vendor.phone,
      email: payload.vendor.email,
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
    holdUntil: data.holdExpiresAt,
    status: "held",
  };
}

export async function initializePayment(
  reservationId: string,
): Promise<PaymentInitializationResponse> {
  const data = await requestBackend<{
    authorization_url: string;
    reference: string;
  }>(`/api/tradefair/registrations/${reservationId}/payments/initialize`, {
    method: "POST",
  });

  return {
    authorizationUrl: data.authorization_url,
    reference: data.reference,
  };
}

export async function verifyPayment(
  reference: string,
): Promise<PaymentVerificationResponse> {
  const data = await requestBackend<{
    status: "success" | "failed" | "pending" | "abandoned";
    bookingReference?: string;
  }>("/api/tradefair/payments/verify", {
    method: "POST",
    body: JSON.stringify({ reference }),
  });

  const normalizedStatus: PaymentVerificationResponse["status"] =
    data.status === "abandoned" ? "failed" : data.status;

  return {
    reservationId: data.bookingReference ?? reference,
    reference,
    status: normalizedStatus,
  };
}

export async function getConfirmation(bookingReference: string): Promise<{
  reference: string;
  status: "success" | "failed" | "pending";
}> {
  const data = await requestBackend<{
    bookingReference: string;
    paymentStatus:
      | "initialized"
      | "pending"
      | "success"
      | "failed"
      | "abandoned"
      | "refunded";
  }>(`/api/tradefair/registrations/${bookingReference}/confirmation`);

  const status =
    data.paymentStatus === "success"
      ? "success"
      : data.paymentStatus === "failed" || data.paymentStatus === "abandoned"
        ? "failed"
        : "pending";

  return {
    reference: data.bookingReference,
    status,
  };
}
