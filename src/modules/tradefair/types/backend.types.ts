import type { Types } from "mongoose";

export type StandType = "premium" | "single" | "shared";
export type SlotStatus = "available" | "held" | "paid" | "blocked";
export type RegistrationStatus =
  | "draft"
  | "held"
  | "pending_payment"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded";
export type PaymentStatus =
  | "initialized"
  | "pending"
  | "success"
  | "failed"
  | "abandoned"
  | "refunded";

export type TradefairAdminRole = "admin" | "event_manager" | "support";
export type TradefairActorType = "admin" | "system" | "vendor";
export type TradefairEntityType =
  | "event"
  | "stand"
  | "slot"
  | "registration"
  | "payment"
  | "category"
  | "terms"
  | "layout";

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface RegistrationFilterQuery extends PaginationQuery {
  vendorName?: string;
  brandName?: string;
  phone?: string;
  standType?: StandType;
  standCode?: string;
  paymentStatus?: PaymentStatus;
  registrationStatus?: RegistrationStatus;
  fromDate?: string;
  toDate?: string;
  category?: string;
  bookingReference?: string;
}

export interface PaymentFilterQuery extends PaginationQuery {
  status?: PaymentStatus;
  fromDate?: string;
  toDate?: string;
  vendor?: string;
  reference?: string;
  channel?: string;
}

export interface AuditLogPayload {
  actorType: TradefairActorType;
  actorId?: string;
  action: string;
  entityType: TradefairEntityType;
  entityId: string | Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface CountAvailabilityResult {
  premiumLeft: number;
  singleLeft: number;
  sharedSlotsLeft: number;
  totalLeft: number;
}
