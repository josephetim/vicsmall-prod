import type { ClientSession, Types } from "mongoose";

import { StandSlotModel, type StandSlotDocument } from "@/modules/tradefair/models/StandSlot";

export const standSlotRepository = {
  async findByEventId(eventId: string | Types.ObjectId) {
    return StandSlotModel.find({ eventId })
      .sort({ standId: 1, slotIndex: 1 })
      .lean<StandSlotDocument[]>();
  },

  async findById(slotId: string | Types.ObjectId) {
    return StandSlotModel.findById(slotId).lean<StandSlotDocument | null>();
  },

  async findByStandId(standId: string | Types.ObjectId) {
    return StandSlotModel.find({ standId })
      .sort({ slotIndex: 1 })
      .lean<StandSlotDocument[]>();
  },

  async findByIdForUpdate(slotId: string | Types.ObjectId, session: ClientSession) {
    return StandSlotModel.findById(slotId).session(session);
  },

  async holdSlotAtomically(
    slotId: string | Types.ObjectId,
    holdUntil: Date,
    vendorSnapshot?: StandSlotDocument["vendorSnapshot"],
    session?: ClientSession,
  ) {
    return StandSlotModel.findOneAndUpdate(
      { _id: slotId, status: "available" },
      {
        $set: {
          status: "held",
          heldUntil: holdUntil,
          vendorSnapshot: vendorSnapshot ?? undefined,
        },
      },
      { returnDocument: "after", session },
    ).lean<StandSlotDocument | null>();
  },

  async updateById(
    slotId: string | Types.ObjectId,
    payload: Partial<StandSlotDocument>,
    session?: ClientSession,
  ) {
    return StandSlotModel.findByIdAndUpdate(slotId, payload, {
      returnDocument: "after",
      session,
    }).lean<StandSlotDocument | null>();
  },
};
