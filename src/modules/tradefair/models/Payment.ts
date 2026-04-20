import { Schema, model, models, Types } from "mongoose";

const paymentStatusValues = [
  "initialized",
  "pending",
  "success",
  "failed",
  "abandoned",
  "refunded",
] as const;

export interface PaymentDocument {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  registrationId: Types.ObjectId;
  vendorId: Types.ObjectId;
  gateway: "paystack";
  gatewayReference: string;
  gatewayAccessCode?: string;
  amountKobo: number;
  currency: string;
  paymentStatus: (typeof paymentStatusValues)[number];
  channel?: string;
  paidAt?: Date;
  rawInitializeResponse?: Record<string, unknown>;
  rawVerifyResponse?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<PaymentDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: "Registration",
      required: true,
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    gateway: { type: String, default: "paystack", required: true },
    gatewayReference: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    gatewayAccessCode: { type: String },
    amountKobo: { type: Number, required: true },
    currency: { type: String, required: true, default: "NGN" },
    paymentStatus: {
      type: String,
      enum: paymentStatusValues,
      required: true,
      index: true,
    },
    channel: { type: String },
    paidAt: { type: Date },
    rawInitializeResponse: { type: Schema.Types.Mixed },
    rawVerifyResponse: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false },
);

PaymentSchema.index({ eventId: 1, paymentStatus: 1, createdAt: -1 });
PaymentSchema.index({ paymentStatus: 1, gatewayReference: 1 });

export const PaymentModel =
  models.Payment || model<PaymentDocument>("Payment", PaymentSchema);
