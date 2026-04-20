import { Schema, model, models, Types } from "mongoose";

const termsStatusValues = ["draft", "active", "archived"] as const;

export interface TermsVersionDocument {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  version: number;
  title: string;
  content: string;
  status: (typeof termsStatusValues)[number];
  activatedAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TermsVersionSchema = new Schema<TermsVersionDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    version: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: termsStatusValues,
      default: "draft",
      index: true,
    },
    activatedAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

TermsVersionSchema.index({ eventId: 1, version: 1 }, { unique: true });
TermsVersionSchema.index({ eventId: 1, status: 1, updatedAt: -1 });

export const TermsVersionModel =
  models.TermsVersion ||
  model<TermsVersionDocument>("TermsVersion", TermsVersionSchema);
