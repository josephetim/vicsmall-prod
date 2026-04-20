import { Schema, model, models, Types } from "mongoose";

export interface LayoutDocument {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  name: string;
  description?: string;
  currentVersionId?: Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LayoutSchema = new Schema<LayoutDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    currentVersionId: { type: Schema.Types.ObjectId, ref: "LayoutVersion" },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

LayoutSchema.index({ eventId: 1, name: 1 }, { unique: true });

export const LayoutModel =
  models.Layout || model<LayoutDocument>("Layout", LayoutSchema);
