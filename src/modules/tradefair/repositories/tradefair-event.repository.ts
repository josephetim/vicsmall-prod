import type { ClientSession, Types } from "mongoose";

import { EventModel, type EventDocument } from "@/modules/tradefair/models/Event";

export const tradefairEventRepository = {
  async findBySlug(slug: string) {
    return EventModel.findOne({ slug }).lean<EventDocument | null>();
  },

  async findById(eventId: string | Types.ObjectId) {
    return EventModel.findById(eventId).lean<EventDocument | null>();
  },

  async create(
    payload: Partial<EventDocument>,
    session?: ClientSession,
  ): Promise<EventDocument> {
    const [doc] = await EventModel.create([payload], { session });
    return doc.toObject();
  },

  async duplicate(
    sourceEventId: string,
    slug: string,
    name: string,
    eventDate: Date,
    session?: ClientSession,
  ) {
    const source = await EventModel.findById(sourceEventId);
    if (!source) return null;

    const [created] = await EventModel.create(
      [
        {
          ...source.toObject(),
          _id: undefined,
          slug,
          name,
          eventDate,
          status: "draft",
        },
      ],
      { session },
    );
    return created.toObject();
  },
};
