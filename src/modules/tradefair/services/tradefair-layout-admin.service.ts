import mongoose from "mongoose";

import { notFound } from "@/backend/utils/http-error";
import { layoutRepository } from "@/modules/tradefair/repositories/layout.repository";
import { tradefairEventRepository } from "@/modules/tradefair/repositories/tradefair-event.repository";
import { CategoryModel } from "@/modules/tradefair/models/Category";
import { EventModel } from "@/modules/tradefair/models/Event";
import { LayoutModel } from "@/modules/tradefair/models/Layout";
import { LayoutVersionModel } from "@/modules/tradefair/models/LayoutVersion";
import { StandModel } from "@/modules/tradefair/models/Stand";
import { StandSlotModel } from "@/modules/tradefair/models/StandSlot";
import { TermsVersionModel } from "@/modules/tradefair/models/TermsVersion";
import { duplicateEventSchema, createLayoutSchema, publishLayoutSchema, updateLayoutSchema } from "@/modules/tradefair/validators/layout.validator";

export const tradefairLayoutAdminService = {
  async listLayouts(eventId: string) {
    const [layouts, versions] = await Promise.all([
      layoutRepository.listLayoutsByEvent(eventId),
      layoutRepository.listVersionsByEvent(eventId),
    ]);
    return { layouts, versions };
  },

  async createLayout(eventId: string, payload: unknown) {
    const parsed = createLayoutSchema.parse(payload);
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        const layout = await layoutRepository.createLayout(
          {
            eventId: new mongoose.Types.ObjectId(eventId),
            name: parsed.name,
            description: parsed.description,
          },
          session,
        );
        const version = await layoutRepository.createVersion(
          {
            eventId: new mongoose.Types.ObjectId(eventId),
            layoutId: layout._id,
            version: 1,
            status: "draft",
            metadata: parsed.metadata ?? {},
          },
          session,
        );
        return { layout, version };
      });
    } finally {
      session.endSession();
    }
  },

  async updateLayout(layoutId: string, payload: unknown) {
    const parsed = updateLayoutSchema.parse(payload);
    const layout = await layoutRepository.findLayoutById(layoutId);
    if (!layout) throw notFound("Layout not found.");

    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(async () => {
        if (parsed.name || parsed.description) {
          await layoutRepository.updateLayoutById(
            layoutId,
            {
              name: parsed.name ?? layout.name,
              description: parsed.description ?? layout.description,
            },
            session,
          );
        }

        if (parsed.metadata) {
          const nextVersion = await layoutRepository.getNextVersion(layoutId);
          await layoutRepository.createVersion(
            {
              eventId: layout.eventId,
              layoutId: layout._id,
              version: nextVersion,
              status: "draft",
              metadata: parsed.metadata,
            },
            session,
          );
        }
        return layoutRepository.findLayoutById(layoutId);
      });
    } finally {
      session.endSession();
    }
  },

  async publishLayout(layoutId: string, payload: unknown) {
    publishLayoutSchema.parse(payload);
    const layout = await layoutRepository.findLayoutById(layoutId);
    if (!layout) {
      throw notFound("Layout not found.");
    }

    const versions = await layoutRepository.listVersionsByLayout(layoutId);
    const version =
      versions.find((item) => item.status === "draft") ??
      versions.find((item) => item.status === "published") ??
      versions[0];
    if (!version) {
      throw notFound("Layout version not found.");
    }

    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(async () => {
        await layoutRepository.archivePublishedByLayout(version.layoutId, session);
        const publishedVersion = await layoutRepository.updateVersionById(
          String(version._id),
          {
            status: "published",
            publishedAt: new Date(),
          },
          session,
        );
        await layoutRepository.updateLayoutById(
          String(version.layoutId),
          {
            isPublished: true,
            publishedAt: new Date(),
            currentVersionId: version._id,
          },
          session,
        );
        return publishedVersion;
      });
    } finally {
      session.endSession();
    }
  },

  async duplicateEvent(eventId: string, payload: unknown) {
    const parsed = duplicateEventSchema.parse(payload);
    const sourceEvent = await tradefairEventRepository.findById(eventId);
    if (!sourceEvent) throw notFound("Source event not found.");

    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(async () => {
        const [duplicatedEvent] = await EventModel.create(
          [
            {
              ...sourceEvent,
              _id: undefined,
              slug: parsed.slug,
              name: parsed.name,
              eventDate: parsed.eventDate,
              status: "draft",
            },
          ],
          { session },
        );

        const [stands, slots, categories, terms, layouts, versions] = await Promise.all([
          StandModel.find({ eventId: sourceEvent._id }).session(session),
          StandSlotModel.find({ eventId: sourceEvent._id }).session(session),
          CategoryModel.find({ eventId: sourceEvent._id }).session(session),
          TermsVersionModel.find({ eventId: sourceEvent._id }).session(session),
          LayoutModel.find({ eventId: sourceEvent._id }).session(session),
          LayoutVersionModel.find({ eventId: sourceEvent._id }).session(session),
        ]);

        const standIdMap = new Map<string, mongoose.Types.ObjectId>();
        for (const stand of stands) {
          const [newStand] = await StandModel.create(
            [
              {
                ...stand.toObject(),
                _id: undefined,
                eventId: duplicatedEvent._id,
                isBlocked: false,
              },
            ],
            { session },
          );
          standIdMap.set(String(stand._id), newStand._id);
        }

        for (const slot of slots) {
          const mappedStandId = standIdMap.get(String(slot.standId));
          if (!mappedStandId) continue;
          await StandSlotModel.create(
            [
              {
                ...slot.toObject(),
                _id: undefined,
                eventId: duplicatedEvent._id,
                standId: mappedStandId,
                status: "available",
                heldUntil: undefined,
                vendorSnapshot: undefined,
              },
            ],
            { session },
          );
        }

        for (const category of categories) {
          await CategoryModel.create(
            [
              {
                ...category.toObject(),
                _id: undefined,
                eventId: duplicatedEvent._id,
              },
            ],
            { session },
          );
        }

        for (const term of terms) {
          await TermsVersionModel.create(
            [
              {
                ...term.toObject(),
                _id: undefined,
                eventId: duplicatedEvent._id,
                status: term.status === "active" ? "draft" : term.status,
                activatedAt: undefined,
              },
            ],
            { session },
          );
        }

        const layoutIdMap = new Map<string, mongoose.Types.ObjectId>();
        for (const layout of layouts) {
          const [newLayout] = await LayoutModel.create(
            [
              {
                ...layout.toObject(),
                _id: undefined,
                eventId: duplicatedEvent._id,
                currentVersionId: undefined,
                isPublished: false,
                publishedAt: undefined,
              },
            ],
            { session },
          );
          layoutIdMap.set(String(layout._id), newLayout._id);
        }

        for (const version of versions) {
          const mappedLayoutId = layoutIdMap.get(String(version.layoutId));
          if (!mappedLayoutId) continue;
          await LayoutVersionModel.create(
            [
              {
                ...version.toObject(),
                _id: undefined,
                eventId: duplicatedEvent._id,
                layoutId: mappedLayoutId,
                status: "draft",
                publishedAt: undefined,
                archivedAt: undefined,
              },
            ],
            { session },
          );
        }

        return duplicatedEvent.toObject();
      });
    } finally {
      session.endSession();
    }
  },
};
