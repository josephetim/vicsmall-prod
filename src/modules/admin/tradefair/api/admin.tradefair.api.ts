import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { buildApiUrl } from "@/lib/api-base-url";
import { ADMIN_AUTH_COOKIE, ADMIN_LOGIN_PATH } from "@/modules/admin/auth/session";
import type {
  AdminAuditLogRecord,
  AdminDashboardSummary,
  AdminPaymentRecord,
  AdminRegistrationRecord,
  AdminStandRecord,
  ExportResponse,
  UpdateRegistrationPayload,
  UpdateSlotPayload,
  UpdateStandPayload,
} from "@/modules/admin/tradefair/types/admin.tradefair.types";

type ApiEnvelope<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error?: { message?: string } };

const EVENT_SLUG =
  process.env.NEXT_PUBLIC_TRADEFAIR_EVENT_SLUG ?? "iuo-2026-tradefair";

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-NG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatVendorName(vendor: {
  firstName?: string;
  lastName?: string;
  brandName?: string;
} | null) {
  if (!vendor) return "Unknown Vendor";
  const composed = [vendor.firstName, vendor.lastName].filter(Boolean).join(" ").trim();
  if (composed) return composed;
  return vendor.brandName || "Unknown Vendor";
}

function normalizeRegistrationStatus(
  status:
    | "draft"
    | "held"
    | "pending_payment"
    | "paid"
    | "failed"
    | "expired"
    | "cancelled"
    | "refunded",
): AdminRegistrationRecord["registrationStatus"] {
  return status;
}

function normalizePaymentStatus(
  status:
    | "initialized"
    | "pending"
    | "success"
    | "failed"
    | "abandoned"
    | "refunded",
): AdminPaymentRecord["status"] {
  return status;
}

async function getAdminAuthHeader() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_AUTH_COOKIE)?.value;
  if (!token) {
    redirect(ADMIN_LOGIN_PATH);
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function adminRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const authHeaders = await getAdminAuthHeader();
  const response = await fetch(buildApiUrl(path), {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    redirect(ADMIN_LOGIN_PATH);
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload || !("success" in payload) || !payload.success) {
    const message =
      payload && "success" in payload && !payload.success
        ? payload.error?.message
        : undefined;
    throw new Error(message ?? "Unable to complete admin request.");
  }

  return { data: payload.data, meta: payload.meta };
}

const getEventId = cache(async () => {
  const response = await fetch(buildApiUrl(`/api/tradefair/events/${EVENT_SLUG}`), {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<{ id: string }>
    | null;

  if (!response.ok || !payload || !("success" in payload) || !payload.success) {
    throw new Error("Unable to resolve tradefair event.");
  }
  return payload.data.id;
});

function mapRegistrationRow(input: {
  registrationId: string;
  bookingReference: string;
  registrationStatus:
    | "draft"
    | "held"
    | "pending_payment"
    | "paid"
    | "failed"
    | "expired"
    | "cancelled"
    | "refunded";
  standType: "premium" | "single" | "shared";
  categories: string[];
  amountKobo: number;
  createdAt: string;
  updatedAt: string;
  vendor: {
    firstName: string;
    lastName: string;
    phone: string;
    brandName: string;
    businessCategory: string[];
  } | null;
  stand: {
    label: string;
  } | null;
  slot: {
    slotLabel: string;
  } | null;
  payment: {
    status:
      | "initialized"
      | "pending"
      | "success"
      | "failed"
      | "abandoned"
      | "refunded";
  } | null;
}): AdminRegistrationRecord {
  return {
    id: input.bookingReference || input.registrationId,
    vendorName: formatVendorName(input.vendor),
    brandName: input.vendor?.brandName ?? "Unknown Brand",
    phone: input.vendor?.phone ?? "-",
    standType: input.standType,
    standLabel: input.stand?.label ?? "-",
    slotLabel: input.slot?.slotLabel ?? null,
    amount: Math.round(input.amountKobo / 100),
    registrationStatus: normalizeRegistrationStatus(input.registrationStatus),
    paymentStatus: normalizePaymentStatus(input.payment?.status ?? "pending"),
    category:
      input.vendor?.businessCategory?.join(", ") ||
      input.categories.join(", ") ||
      "-",
    createdAt: formatDate(input.createdAt),
    updatedAt: formatDate(input.updatedAt),
  };
}

export async function getDashboard(): Promise<AdminDashboardSummary> {
  const eventId = await getEventId();
  const { data } = await adminRequest<{
    metrics: {
      premiumSold: number;
      singleSold: number;
      sharedSlotsSold: number;
      premiumRemaining: number;
      singleRemaining: number;
      sharedSlotsRemaining: number;
      activeHolds: number;
      expiredHolds: number;
      totalRevenueKobo: number;
    };
  }>(`/api/admin/tradefair/events/${eventId}/dashboard`);

  const totalRegistrations =
    data.metrics.premiumSold +
    data.metrics.singleSold +
    data.metrics.sharedSlotsSold +
    data.metrics.activeHolds +
    data.metrics.expiredHolds;

  return {
    totalRegistrations,
    successfulPayments:
      data.metrics.premiumSold +
      data.metrics.singleSold +
      data.metrics.sharedSlotsSold,
    pendingHolds: data.metrics.activeHolds,
    availableUnits:
      data.metrics.premiumRemaining +
      data.metrics.singleRemaining +
      data.metrics.sharedSlotsRemaining,
    grossRevenue: Math.round(data.metrics.totalRevenueKobo / 100),
  };
}

export async function getRegistrations(): Promise<AdminRegistrationRecord[]> {
  const eventId = await getEventId();
  const { data } = await adminRequest<
    Array<{
      registrationId: string;
      bookingReference: string;
      registrationStatus:
        | "draft"
        | "held"
        | "pending_payment"
        | "paid"
        | "failed"
        | "expired"
        | "cancelled"
        | "refunded";
      standType: "premium" | "single" | "shared";
      categories: string[];
      amountKobo: number;
      createdAt: string;
      updatedAt: string;
      vendor: {
        firstName: string;
        lastName: string;
        phone: string;
        brandName: string;
        businessCategory: string[];
      } | null;
      stand: {
        label: string;
      } | null;
      slot: {
        slotLabel: string;
      } | null;
      payment: {
        status:
          | "initialized"
          | "pending"
          | "success"
          | "failed"
          | "abandoned"
          | "refunded";
      } | null;
    }>
  >(`/api/admin/tradefair/events/${eventId}/registrations`);

  return data.map(mapRegistrationRow);
}

export async function getRegistrationById(
  registrationId: string,
): Promise<AdminRegistrationRecord | null> {
  const { data } = await adminRequest<{
    registration: {
      id: string;
      bookingReference: string;
      registrationStatus:
        | "draft"
        | "held"
        | "pending_payment"
        | "paid"
        | "failed"
        | "expired"
        | "cancelled"
        | "refunded";
      standType: "premium" | "single" | "shared";
      categories: string[];
      amountKobo: number;
      createdAt: string;
      updatedAt: string;
    };
    vendor: {
      firstName: string;
      lastName: string;
      phone: string;
      brandName: string;
      businessCategory: string[];
    } | null;
    stand: {
      label: string;
    } | null;
    slot: {
      slotLabel: string;
    } | null;
    payments: Array<{
      paymentStatus:
        | "initialized"
        | "pending"
        | "success"
        | "failed"
        | "abandoned"
        | "refunded";
    }>;
  }>(`/api/admin/tradefair/registrations/${registrationId}`);

  if (!data?.registration) return null;

  return mapRegistrationRow({
    registrationId: data.registration.id,
    bookingReference: data.registration.bookingReference,
    registrationStatus: data.registration.registrationStatus,
    standType: data.registration.standType,
    categories: data.registration.categories,
    amountKobo: data.registration.amountKobo,
    createdAt: data.registration.createdAt,
    updatedAt: data.registration.updatedAt,
    vendor: data.vendor,
    stand: data.stand,
    slot: data.slot,
    payment: data.payments[0] ? { status: data.payments[0].paymentStatus } : null,
  });
}

export async function getPayments(): Promise<AdminPaymentRecord[]> {
  const eventId = await getEventId();
  const { data } = await adminRequest<
    Array<{
      paymentId: string;
      status:
        | "initialized"
        | "pending"
        | "success"
        | "failed"
        | "abandoned"
        | "refunded";
      reference: string;
      amountKobo: number;
      channel: string | null;
      createdAt: string;
      registration: {
        bookingReference: string;
      } | null;
      vendor: {
        firstName: string;
        lastName: string;
        brandName: string;
      } | null;
    }>
  >(`/api/admin/tradefair/events/${eventId}/payments`);

  return data.map((row) => ({
    id: row.paymentId,
    reservationId: row.registration?.bookingReference ?? "-",
    vendorName: formatVendorName(row.vendor),
    brandName: row.vendor?.brandName ?? "Unknown Brand",
    amount: Math.round(row.amountKobo / 100),
    status: normalizePaymentStatus(row.status),
    reference: row.reference,
    channel: row.channel ?? "unknown",
    createdAt: formatDate(row.createdAt),
  }));
}

export async function getStands(): Promise<AdminStandRecord[]> {
  const eventId = await getEventId();
  const { data } = await adminRequest<{
    stands: Array<{
      id: string;
      label: string;
      standType: "premium" | "single" | "shared";
      occupancyStatus: "available" | "held" | "paid" | "blocked";
      capacity: number;
      occupiedSlots: number;
      heldSlots: number;
      slots: Array<{
        id: string;
        slotLabel: string;
        status: "available" | "held" | "paid" | "blocked";
        vendor: {
          brandName?: string;
          firstName?: string;
          lastName?: string;
        } | null;
      }>;
    }>;
  }>(`/api/admin/tradefair/events/${eventId}/stands`);

  return data.stands.map((stand) => {
    const occupied =
      stand.standType === "shared"
        ? stand.occupiedSlots + stand.heldSlots
        : stand.occupancyStatus === "available"
          ? 0
          : 1;

    return {
      id: stand.id,
      label: stand.label,
      type: stand.standType,
      occupied,
      capacity: stand.capacity,
      status: stand.occupancyStatus,
      slots:
        stand.standType === "shared"
          ? stand.slots.map((slot) => ({
              id: slot.id,
              label: slot.slotLabel,
              status: slot.status,
              vendorName: slot.vendor ? formatVendorName(slot.vendor) : null,
            }))
          : undefined,
    };
  });
}

export async function updateRegistration(
  registrationId: string,
  payload: UpdateRegistrationPayload,
): Promise<AdminRegistrationRecord | null> {
  if (!payload.registrationStatus && payload.paymentStatus !== "refunded") {
    return getRegistrationById(registrationId);
  }

  const body =
    payload.paymentStatus === "refunded"
      ? { action: "mark_refunded", reason: "Admin update from dashboard" }
      : {
          action: "manual_status",
          registrationStatus: payload.registrationStatus,
        };

  await adminRequest(`/api/admin/tradefair/registrations/${registrationId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  return getRegistrationById(registrationId);
}

export async function updateStand(
  standId: string,
  payload: UpdateStandPayload,
): Promise<AdminStandRecord | null> {
  const action =
    payload.status === "blocked"
      ? "block"
      : payload.status === "available"
        ? "unblock"
        : "update";

  await adminRequest(`/api/admin/tradefair/stands/${standId}`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });

  const stands = await getStands();
  return stands.find((stand) => stand.id === standId) ?? null;
}

export async function updateSlot(
  standId: string,
  slotId: string,
  payload: UpdateSlotPayload,
): Promise<AdminStandRecord | null> {
  const action =
    payload.status === "blocked"
      ? "block"
      : payload.status === "available"
        ? "set_status"
        : payload.status
          ? "set_status"
          : "update_snapshot";

  await adminRequest(`/api/admin/tradefair/stand-slots/${slotId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action,
      status: payload.status,
      vendorSnapshot:
        payload.vendorName !== undefined
          ? { vendorName: payload.vendorName }
          : undefined,
    }),
  });

  const stands = await getStands();
  return stands.find((stand) => stand.id === standId) ?? null;
}

export async function exportRegistrations(
  format: "csv" | "xlsx",
): Promise<ExportResponse> {
  const eventId = await getEventId();
  const normalizedFormat = format === "xlsx" ? "json" : format;
  return {
    url: buildApiUrl(
      `/api/admin/tradefair/events/${eventId}/export/registrations?format=${normalizedFormat}`,
    ),
    format,
  };
}

export async function exportPayments(format: "csv" | "xlsx"): Promise<ExportResponse> {
  const eventId = await getEventId();
  const normalizedFormat = format === "xlsx" ? "json" : format;
  return {
    url: buildApiUrl(
      `/api/admin/tradefair/events/${eventId}/export/payments?format=${normalizedFormat}`,
    ),
    format,
  };
}

export async function exportStands(format: "csv" | "xlsx"): Promise<ExportResponse> {
  const eventId = await getEventId();
  const normalizedFormat = format === "xlsx" ? "json" : format;
  return {
    url: buildApiUrl(
      `/api/admin/tradefair/events/${eventId}/export/stands?format=${normalizedFormat}`,
    ),
    format,
  };
}

export async function getAuditLogs(): Promise<AdminAuditLogRecord[]> {
  const registrations = await getRegistrations();
  return registrations.slice(0, 10).map((registration) => ({
    id: registration.id,
    actor: "Admin",
    action: `REGISTRATION_${registration.registrationStatus.toUpperCase()}`,
    entity: "registration",
    entityId: registration.id,
    createdAt: registration.updatedAt,
  }));
}

export async function getTradefairDashboardSummary(): Promise<AdminDashboardSummary> {
  return getDashboard();
}

export async function getTradefairRegistrations(): Promise<AdminRegistrationRecord[]> {
  return getRegistrations();
}

export async function getTradefairRegistrationDetail(
  registrationId: string,
): Promise<AdminRegistrationRecord | null> {
  return getRegistrationById(registrationId);
}

export async function getTradefairPayments(): Promise<AdminPaymentRecord[]> {
  return getPayments();
}

export async function getTradefairStands(): Promise<AdminStandRecord[]> {
  return getStands();
}

export async function updateTradefairStandStatus(
  standId: string,
  status: "available" | "held" | "paid",
): Promise<AdminStandRecord | null> {
  return updateStand(standId, { status });
}

export async function exportTradefairData(
  format: "csv" | "xlsx",
): Promise<{ url: string }> {
  const result = await exportRegistrations(format);
  return { url: result.url };
}

export async function getTradefairAuditLogs(): Promise<AdminAuditLogRecord[]> {
  return getAuditLogs();
}
