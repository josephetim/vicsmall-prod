import { Schema, model, models, Types } from "mongoose";

export interface StandZoneDocument {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  code: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const StandZoneSchema = new Schema<StandZoneDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

StandZoneSchema.index({ eventId: 1, code: 1 }, { unique: true });

export const StandZoneModel =
  models.StandZone || model<StandZoneDocument>("StandZone", StandZoneSchema);
