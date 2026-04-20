import { Schema, model, models, Types } from "mongoose";

const slotStatusValues = ["available", "held", "paid", "blocked"] as const;

export interface StandSlotDocument {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  standId: Types.ObjectId;
  slotCode: string;
  slotLabel: string;
  slotIndex: number;
  slotPriceKobo: number;
  status: (typeof slotStatusValues)[number];
  heldUntil?: Date;
  vendorSnapshot?: {
    vendorId?: Types.ObjectId;
    vendorName?: string;
    brandName?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const StandSlotSchema = new Schema<StandSlotDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    standId: {
      type: Schema.Types.ObjectId,
      ref: "Stand",
      required: true,
      index: true,
    },
    slotCode: { type: String, required: true, trim: true },
    slotLabel: { type: String, required: true, trim: true },
    slotIndex: { type: Number, required: true },
    slotPriceKobo: { type: Number, required: true },
    status: { type: String, enum: slotStatusValues, default: "available", index: true },
    heldUntil: { type: Date },
    vendorSnapshot: {
      vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
      vendorName: { type: String },
      brandName: { type: String },
    },
  },
  { timestamps: true, versionKey: false },
);

StandSlotSchema.index({ standId: 1, slotCode: 1 }, { unique: true });
StandSlotSchema.index({ eventId: 1, status: 1 });
StandSlotSchema.index(
  { _id: 1, status: 1 },
  {
    name: "stand_slot_atomic_status_lookup",
  },
);

export const StandSlotModel =
  models.StandSlot || model<StandSlotDocument>("StandSlot", StandSlotSchema);
