import { Schema, model, models, Types } from "mongoose";

const eventStatusValues = ["draft", "live", "closed", "archived"] as const;

export interface EventDocument {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  venue: string;
  eventDate: Date;
  status: (typeof eventStatusValues)[number];
  registrationOpenAt?: Date;
  registrationCloseAt?: Date;
  shortDescription?: string;
  bannerText?: string;
  registrationStatusText?: string;
  publicHelperText?: string;
  displayLabels?: {
    photoBoothLabel?: string;
    vicsmallStandLabel?: string;
    stageLabel?: string;
  };
  updatedBy?: string;
  currency: string;
  prices: {
    premiumKobo: number;
    singleKobo: number;
    sharedCanopyKobo: number;
    sharedSlotKobo: number;
  };
  supportContact: {
    whatsapp: string;
    phone?: string;
    email?: string;
  };
  fieldMeta: {
    fenced: boolean;
    gatePosition: string;
    topLeftFeatures: string[];
    topFeature: string;
    premiumFrontRow: boolean;
    walkwayStyle: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<EventDocument>(
  {
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    eventDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: eventStatusValues,
      default: "draft",
      index: true,
    },
    registrationOpenAt: { type: Date },
    registrationCloseAt: { type: Date },
    shortDescription: { type: String },
    bannerText: { type: String },
    registrationStatusText: { type: String },
    publicHelperText: { type: String },
    displayLabels: {
      photoBoothLabel: { type: String },
      vicsmallStandLabel: { type: String },
      stageLabel: { type: String },
    },
    updatedBy: { type: String },
    currency: { type: String, default: "NGN", required: true },
    prices: {
      premiumKobo: { type: Number, required: true },
      singleKobo: { type: Number, required: true },
      sharedCanopyKobo: { type: Number, required: true },
      sharedSlotKobo: { type: Number, required: true },
    },
    supportContact: {
      whatsapp: { type: String, required: true },
      phone: { type: String },
      email: { type: String },
    },
    fieldMeta: {
      fenced: { type: Boolean, default: true },
      gatePosition: { type: String, default: "top-center" },
      topLeftFeatures: { type: [String], default: ["vicsmall-stand", "photo-booth"] },
      topFeature: { type: String, default: "dj-stage" },
      premiumFrontRow: { type: Boolean, default: true },
      walkwayStyle: { type: String, default: "compact-center" },
    },
  },
  { timestamps: true, versionKey: false },
);

EventSchema.index({ status: 1, eventDate: 1 });

export const EventModel = models.Event || model<EventDocument>("Event", EventSchema);
