import type { ClientSession, Types } from "mongoose";

import { LayoutModel, type LayoutDocument } from "@/modules/tradefair/models/Layout";
import { LayoutVersionModel, type LayoutVersionDocument } from "@/modules/tradefair/models/LayoutVersion";

export const layoutRepository = {
  async listLayoutsByEvent(eventId: string | Types.ObjectId) {
    return LayoutModel.find({ eventId })
      .sort({ createdAt: -1 })
      .lean<LayoutDocument[]>();
  },

  async findLayoutById(layoutId: string | Types.ObjectId) {
    return LayoutModel.findById(layoutId).lean<LayoutDocument | null>();
  },

  async createLayout(payload: Partial<LayoutDocument>, session?: ClientSession) {
    const [doc] = await LayoutModel.create([payload], { session });
    return doc.toObject();
  },

  async updateLayoutById(
    layoutId: string,
    payload: Partial<LayoutDocument>,
    session?: ClientSession,
  ) {
    return LayoutModel.findByIdAndUpdate(layoutId, payload, {
      returnDocument: "after",
      session,
    }).lean<LayoutDocument | null>();
  },

  async listVersionsByEvent(eventId: string | Types.ObjectId) {
    return LayoutVersionModel.find({ eventId })
      .sort({ createdAt: -1 })
      .lean<LayoutVersionDocument[]>();
  },

  async listVersionsByLayout(layoutId: string | Types.ObjectId) {
    return LayoutVersionModel.find({ layoutId })
      .sort({ version: -1 })
      .lean<LayoutVersionDocument[]>();
  },

  async findVersionById(versionId: string | Types.ObjectId) {
    return LayoutVersionModel.findById(versionId).lean<LayoutVersionDocument | null>();
  },

  async getNextVersion(layoutId: string | Types.ObjectId) {
    const latest = await LayoutVersionModel.findOne({ layoutId })
      .sort({ version: -1 })
      .lean<LayoutVersionDocument | null>();
    return (latest?.version ?? 0) + 1;
  },

  async createVersion(
    payload: Partial<LayoutVersionDocument>,
    session?: ClientSession,
  ) {
    const [doc] = await LayoutVersionModel.create([payload], { session });
    return doc.toObject();
  },

  async archivePublishedByLayout(
    layoutId: string | Types.ObjectId,
    session?: ClientSession,
  ) {
    await LayoutVersionModel.updateMany(
      { layoutId, status: "published" },
      { $set: { status: "archived", archivedAt: new Date() } },
      { session },
    );
  },

  async updateVersionById(
    versionId: string,
    payload: Partial<LayoutVersionDocument>,
    session?: ClientSession,
  ) {
    return LayoutVersionModel.findByIdAndUpdate(versionId, payload, {
      returnDocument: "after",
      session,
    }).lean<LayoutVersionDocument | null>();
  },
};
