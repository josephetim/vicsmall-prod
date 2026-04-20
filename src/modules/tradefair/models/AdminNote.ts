import { Schema, model, models, Types } from "mongoose";

export interface AdminNoteDocument {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  registrationId: Types.ObjectId;
  adminUserId: string;
  note: string;
  createdAt: Date;
}

const AdminNoteSchema = new Schema<AdminNoteDocument>(
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
    adminUserId: { type: String, required: true, index: true },
    note: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

AdminNoteSchema.index({ registrationId: 1, createdAt: -1 });

export const AdminNoteModel =
  models.AdminNote || model<AdminNoteDocument>("AdminNote", AdminNoteSchema);
