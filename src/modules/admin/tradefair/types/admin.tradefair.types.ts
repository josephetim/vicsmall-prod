export type AdminStandType = "premium" | "single" | "shared";
export type AdminRegistrationStatus =
  | "draft"
  | "held"
  | "pending_payment"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded";
export type AdminPaymentStatus =
  | "initialized"
  | "success"
  | "failed"
  | "pending"
  | "abandoned"
  | "refunded";
export type AdminOccupancyStatus = "available" | "held" | "paid" | "blocked";

export interface AdminDashboardSummary {
  totalRegistrations: number;
  successfulPayments: number;
  pendingHolds: number;
  availableUnits: number;
  grossRevenue: number;
}

export interface AdminRegistrationRecord {
  id: string;
  vendorName: string;
  brandName: string;
  phone: string;
  standType: AdminStandType;
  standLabel: string;
  slotLabel: string | null;
  amount: number;
  registrationStatus: AdminRegistrationStatus;
  paymentStatus: AdminPaymentStatus;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentRecord {
  id: string;
  reservationId: string;
  vendorName: string;
  brandName: string;
  amount: number;
  status: AdminPaymentStatus;
  reference: string;
  channel: string;
  createdAt: string;
}

export interface AdminStandSlotRecord {
  id: string;
  label: string;
  status: AdminOccupancyStatus;
  vendorName: string | null;
}

export interface AdminStandRecord {
  id: string;
  label: string;
  type: AdminStandType;
  occupied: number;
  capacity: number;
  status: AdminOccupancyStatus;
  slots?: AdminStandSlotRecord[];
}

export interface AdminAuditLogRecord {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
}

export interface UpdateRegistrationPayload {
  registrationStatus?: AdminRegistrationStatus;
  paymentStatus?: AdminPaymentStatus;
  standLabel?: string;
  slotLabel?: string | null;
}

export interface UpdateStandPayload {
  status?: AdminOccupancyStatus;
}

export interface UpdateSlotPayload {
  status?: AdminOccupancyStatus;
  vendorName?: string | null;
}

export interface ExportResponse {
  url: string;
  format: "csv" | "xlsx";
}
