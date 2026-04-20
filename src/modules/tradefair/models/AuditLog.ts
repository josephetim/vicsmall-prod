import { Schema, model, models, Types } from "mongoose";

const actorTypeValues = ["admin", "system", "vendor"] as const;
const entityTypeValues = [
  "event",
  "stand",
  "slot",
  "registration",
  "payment",
  "category",
  "terms",
  "layout",
] as const;

export interface AuditLogDocument {
  _id: Types.ObjectId;
  eventId?: Types.ObjectId;
  actorType: (typeof actorTypeValues)[number];
  actorId?: string;
  action: string;
  entityType: (typeof entityTypeValues)[number];
  entityId: Types.ObjectId | string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", index: true },
    actorType: { type: String, enum: actorTypeValues, required: true, index: true },
    actorId: { type: String },
    action: { type: String, required: true, index: true },
    entityType: { type: String, enum: entityTypeValues, required: true, index: true },
    entityId: { type: Schema.Types.Mixed, required: true, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

AuditLogSchema.index({ eventId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLogModel =
  models.AuditLog || model<AuditLogDocument>("AuditLog", AuditLogSchema);
