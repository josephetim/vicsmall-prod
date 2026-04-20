import { Schema, model, models, Types } from "mongoose";

const layoutVersionStatusValues = ["draft", "published", "archived"] as const;

export interface LayoutVersionDocument {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  layoutId: Types.ObjectId;
  version: number;
  status: (typeof layoutVersionStatusValues)[number];
  metadata: Record<string, unknown>;
  publishedAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LayoutVersionSchema = new Schema<LayoutVersionDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    layoutId: {
      type: Schema.Types.ObjectId,
      ref: "Layout",
      required: true,
      index: true,
    },
    version: { type: Number, required: true },
    status: {
      type: String,
      enum: layoutVersionStatusValues,
      default: "draft",
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    publishedAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

LayoutVersionSchema.index({ layoutId: 1, version: 1 }, { unique: true });
LayoutVersionSchema.index({ eventId: 1, status: 1, updatedAt: -1 });

export const LayoutVersionModel =
  models.LayoutVersion ||
  model<LayoutVersionDocument>("LayoutVersion", LayoutVersionSchema);
