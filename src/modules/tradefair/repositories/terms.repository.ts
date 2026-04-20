import type { ClientSession, Types } from "mongoose";

import { TermsVersionModel, type TermsVersionDocument } from "@/modules/tradefair/models/TermsVersion";

export const termsRepository = {
  async listByEvent(eventId: string | Types.ObjectId) {
    return TermsVersionModel.find({ eventId })
      .sort({ version: -1 })
      .lean<TermsVersionDocument[]>();
  },

  async findById(termsId: string | Types.ObjectId) {
    return TermsVersionModel.findById(termsId).lean<TermsVersionDocument | null>();
  },

  async getActiveByEvent(eventId: string | Types.ObjectId) {
    return TermsVersionModel.findOne({ eventId, status: "active" }).lean<TermsVersionDocument | null>();
  },

  async getNextVersionNumber(eventId: string | Types.ObjectId) {
    const latest = await TermsVersionModel.findOne({ eventId }).sort({ version: -1 }).lean<TermsVersionDocument | null>();
    return (latest?.version ?? 0) + 1;
  },

  async create(payload: Partial<TermsVersionDocument>, session?: ClientSession) {
    const [doc] = await TermsVersionModel.create([payload], { session });
    return doc.toObject();
  },

  async archiveAllActive(eventId: string | Types.ObjectId, session?: ClientSession) {
    await TermsVersionModel.updateMany(
      { eventId, status: "active" },
      { $set: { status: "archived", archivedAt: new Date() } },
      { session },
    );
  },

  async updateById(
    termsId: string,
    payload: Partial<TermsVersionDocument>,
    session?: ClientSession,
  ) {
    return TermsVersionModel.findByIdAndUpdate(termsId, payload, {
      returnDocument: "after",
      session,
    }).lean<TermsVersionDocument | null>();
  },
};
