import type { ClientSession } from "mongoose";
import { Types } from "mongoose";

import { AuditLogModel, type AuditLogDocument } from "@/modules/tradefair/models/AuditLog";
import type { AuditLogPayload } from "@/modules/tradefair/types/backend.types";

export const auditLogRepository = {
  async create(payload: AuditLogPayload & { eventId?: string }, session?: ClientSession) {
    const [doc] = await AuditLogModel.create(
      [
        {
          eventId: payload.eventId ? new Types.ObjectId(payload.eventId) : undefined,
          actorType: payload.actorType,
          actorId: payload.actorId,
          action: payload.action,
          entityType: payload.entityType,
          entityId: payload.entityId,
          metadata: payload.metadata ?? {},
        },
      ],
      { session },
    );
    return doc.toObject();
  },

  async listByEntity(entityType: string, entityId: string) {
    return AuditLogModel.find({ entityType, entityId })
      .sort({ createdAt: -1 })
      .lean<AuditLogDocument[]>();
  },

  async listByEvent(eventId: string, limit = 100) {
    return AuditLogModel.find({ eventId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<AuditLogDocument[]>();
  },
};
