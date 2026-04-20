import { Schema, model, models, Types } from "mongoose";

const standTypeValues = ["premium", "single", "shared"] as const;
const standStatusValues = ["active", "disabled", "hidden"] as const;

export interface StandDocument {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  zoneId?: Types.ObjectId;
  standCode: string;
  standType: (typeof standTypeValues)[number];
  label: string;
  columnNo: number;
  rowNo: number;
  xPosition?: number;
  yPosition?: number;
  capacity: number;
  fullPriceKobo: number;
  status: (typeof standStatusValues)[number];
  isBlocked: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const StandSchema = new Schema<StandDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    zoneId: { type: Schema.Types.ObjectId, ref: "StandZone", index: true },
    standCode: { type: String, required: true, trim: true },
    standType: { type: String, enum: standTypeValues, required: true, index: true },
    label: { type: String, required: true, trim: true },
    columnNo: { type: Number, required: true },
    rowNo: { type: Number, required: true },
    xPosition: { type: Number },
    yPosition: { type: Number },
    capacity: { type: Number, required: true },
    fullPriceKobo: { type: Number, required: true },
    status: { type: String, enum: standStatusValues, default: "active", index: true },
    isBlocked: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

StandSchema.index({ eventId: 1, standCode: 1 }, { unique: true });
StandSchema.index({ eventId: 1, standType: 1, columnNo: 1, rowNo: 1 });

export const StandModel = models.Stand || model<StandDocument>("Stand", StandSchema);
