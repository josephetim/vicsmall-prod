import { Schema, model, models, Types } from "mongoose";

const registrationStatusValues = [
  "draft",
  "held",
  "pending_payment",
  "paid",
  "failed",
  "expired",
  "cancelled",
  "refunded",
] as const;
const standTypeValues = ["premium", "single", "shared"] as const;

export interface RegistrationDocument {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  vendorId: Types.ObjectId;
  standId: Types.ObjectId;
  standSlotId?: Types.ObjectId;
  standType: (typeof standTypeValues)[number];
  bookingReference: string;
  amountKobo: number;
  currency: string;
  registrationStatus: (typeof registrationStatusValues)[number];
  termsAccepted: boolean;
  termsAcceptedAt?: Date;
  holdExpiresAt?: Date;
  paymentDueAt?: Date;
  categories: string[];
  notes?: string;
  paidAt?: Date;
  cancelledAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RegistrationSchema = new Schema<RegistrationDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    standId: {
      type: Schema.Types.ObjectId,
      ref: "Stand",
      required: true,
      index: true,
    },
    standSlotId: {
      type: Schema.Types.ObjectId,
      ref: "StandSlot",
      index: true,
      sparse: true,
    },
    standType: { type: String, enum: standTypeValues, required: true, index: true },
    bookingReference: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    amountKobo: { type: Number, required: true },
    currency: { type: String, default: "NGN", required: true },
    registrationStatus: {
      type: String,
      enum: registrationStatusValues,
      required: true,
      index: true,
    },
    termsAccepted: { type: Boolean, required: true, default: false },
    termsAcceptedAt: { type: Date },
    holdExpiresAt: { type: Date, index: true },
    paymentDueAt: { type: Date },
    categories: { type: [String], default: [] },
    notes: { type: String },
    paidAt: { type: Date },
    cancelledAt: { type: Date },
    refundedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

RegistrationSchema.index({ eventId: 1, registrationStatus: 1, createdAt: -1 });
RegistrationSchema.index({ standId: 1, registrationStatus: 1 });
RegistrationSchema.index({ standSlotId: 1, registrationStatus: 1 });
RegistrationSchema.index({ eventId: 1, categories: 1 });
RegistrationSchema.index(
  { standId: 1, registrationStatus: 1 },
  {
    unique: true,
    partialFilterExpression: {
      standType: { $in: ["premium", "single"] },
      registrationStatus: { $in: ["held", "pending_payment", "paid"] },
    },
    name: "unique_active_registration_per_premium_single_stand",
  },
);
RegistrationSchema.index(
  { standSlotId: 1, registrationStatus: 1 },
  {
    unique: true,
    partialFilterExpression: {
      standType: "shared",
      standSlotId: { $exists: true },
      registrationStatus: { $in: ["held", "pending_payment", "paid"] },
    },
    name: "unique_active_registration_per_shared_slot",
  },
);

export const RegistrationModel =
  models.Registration ||
  model<RegistrationDocument>("Registration", RegistrationSchema);
