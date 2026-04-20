import mongoose from "mongoose";

import { notFound } from "@/backend/utils/http-error";
import { termsRepository } from "@/modules/tradefair/repositories/terms.repository";
import { createTermsSchema, updateTermsSchema } from "@/modules/tradefair/validators/terms.validator";

export const tradefairTermsService = {
  async listByEvent(eventId: string) {
    return termsRepository.listByEvent(eventId);
  },

  async create(eventId: string, payload: unknown, actorId: string) {
    const parsed = createTermsSchema.parse(payload);
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        const version = await termsRepository.getNextVersionNumber(eventId);

        if (parsed.status === "active") {
          await termsRepository.archiveAllActive(eventId, session);
        }

        const created = await termsRepository.create(
          {
            eventId: new mongoose.Types.ObjectId(eventId),
            version,
            title: parsed.title,
            content: parsed.content,
            status: parsed.status ?? "draft",
            activatedAt: parsed.status === "active" ? new Date() : undefined,
          },
          session,
        );

        return { ...created, actorId };
      });
    } finally {
      session.endSession();
    }
  },

  async update(termsId: string, payload: unknown) {
    const parsed = updateTermsSchema.parse(payload);
    const existing = await termsRepository.findById(termsId);
    if (!existing) throw notFound("Terms version not found.");

    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(async () => {
        if (parsed.status === "active") {
          await termsRepository.archiveAllActive(existing.eventId, session);
        }

        const updated = await termsRepository.updateById(
          termsId,
          {
            ...parsed,
            activatedAt: parsed.status === "active" ? new Date() : existing.activatedAt,
            archivedAt: parsed.status === "archived" ? new Date() : existing.archivedAt,
          },
          session,
        );
        return updated;
      });
    } finally {
      session.endSession();
    }
  },
};
