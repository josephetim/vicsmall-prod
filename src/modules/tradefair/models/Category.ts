import { Schema, model, models, Types } from "mongoose";

export interface CategoryDocument {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  code: string;
  name: string;
  isOpen: boolean;
  limit: number | null;
  priceOverrideKobo: number | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<CategoryDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    isOpen: { type: Boolean, default: true, index: true },
    limit: { type: Number, default: null },
    priceOverrideKobo: { type: Number, default: null },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false },
);

CategorySchema.index({ eventId: 1, code: 1 }, { unique: true });
CategorySchema.index({ eventId: 1, name: 1 });

export const CategoryModel =
  models.Category || model<CategoryDocument>("Category", CategorySchema);
