import type { ClientSession, Types } from "mongoose";

import { StandModel, type StandDocument } from "@/modules/tradefair/models/Stand";

export const standRepository = {
  async findByEventId(eventId: string | Types.ObjectId) {
    return StandModel.find({ eventId })
      .sort({ standType: 1, columnNo: 1, rowNo: 1 })
      .lean<StandDocument[]>();
  },

  async findById(standId: string | Types.ObjectId) {
    return StandModel.findById(standId).lean<StandDocument | null>();
  },

  async findByIdForUpdate(
    standId: string | Types.ObjectId,
    session: ClientSession,
  ) {
    return StandModel.findById(standId).session(session);
  },

  async findByEventAndCode(eventId: string, standCode: string) {
    return StandModel.findOne({ eventId, standCode }).lean<StandDocument | null>();
  },

  async updateById(
    standId: string,
    payload: Partial<StandDocument>,
    session?: ClientSession,
  ) {
    return StandModel.findByIdAndUpdate(standId, payload, {
      returnDocument: "after",
      session,
    }).lean<StandDocument | null>();
  },
};
