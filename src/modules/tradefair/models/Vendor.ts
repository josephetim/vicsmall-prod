import { Schema, model, models, Types } from "mongoose";

export interface VendorDocument {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  brandName: string;
  businessCategory: string[];
  standPreferences?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<VendorDocument>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, index: true, sparse: true },
    brandName: { type: String, required: true, trim: true, index: true },
    businessCategory: { type: [String], default: [] },
    standPreferences: { type: String },
  },
  { timestamps: true, versionKey: false },
);

VendorSchema.index({ phone: 1, brandName: 1 }, { unique: true });
VendorSchema.index({ createdAt: -1 });

export const VendorModel =
  models.Vendor || model<VendorDocument>("Vendor", VendorSchema);
