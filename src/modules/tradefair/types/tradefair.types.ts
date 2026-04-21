export type StandType = "premium" | "single" | "shared";
export type SlotStatus = "available" | "held" | "paid";
export type RegistrationStatus = "held" | "paid" | "expired" | "cancelled";

export interface EventSummary {
  id: string;
  slug: string;
  name: string;
  venue: string;
  dateLabel: string;
  holdMinutes: number;
  status: "draft" | "live" | "closed" | "archived";
  supportContact: {
    whatsapp: string;
    phone?: string;
    email?: string;
  };
  shortDescription?: string;
  bannerText?: string;
  registrationStatusText?: string;
  publicHelperText?: string;
  displayLabels?: {
    photoBoothLabel?: string;
    vicsmallStandLabel?: string;
    stageLabel?: string;
  };
}

export interface SharedStandSlot {
  id: string;
  label: string;
  occupied: boolean;
  vendorName: string;
}

export interface Stand {
  id: string;
  label: string;
  type: StandType;
  price: number;
  capacity: number;
  occupied: number;
  column: string;
  row: number;
  slots?: SharedStandSlot[];
}

export interface TradefairLayout {
  premium: Stand[];
  single: Stand[];
  shared: Stand[];
}

export interface VendorProfile {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  brandName: string;
  categories: string[];
  preferences: string;
  agree: boolean;
}

export interface ReservationRecord {
  id: string;
  type: StandType;
  unitId: string;
  slotId: string | null;
  amount: number;
  status: RegistrationStatus;
  holdUntil?: string;
  customer: VendorProfile;
  createdAt: string;
  paidAt?: string;
}

export interface PaymentRecord {
  id: string;
  reservationId: string;
  amount: number;
  status: "success" | "failed" | "pending";
  gateway: "Paystack" | "Unknown";
  gatewayReference: string;
  createdAt: string;
}

export interface CreateHoldPayload {
  standId: string;
  standType: StandType;
  slotId?: string;
  amount: number;
  vendor: VendorProfile;
}

export interface CreateHoldResponse {
  reservationId: string;
  holdUntil: string;
  status: RegistrationStatus;
}

export interface PaymentInitializationResponse {
  authorizationUrl: string;
  reference: string;
}

export interface PaymentVerificationResponse {
  reservationId: string;
  reference: string;
  status: "success" | "failed" | "pending";
}
