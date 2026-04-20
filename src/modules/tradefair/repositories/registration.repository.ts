import type { ClientSession, Types } from "mongoose";

import { RegistrationModel, type RegistrationDocument } from "@/modules/tradefair/models/Registration";
import type { PaginatedResult, RegistrationFilterQuery } from "@/modules/tradefair/types/backend.types";
import { paginateModel } from "@/modules/tradefair/repositories/repository.utils";

const ACTIVE_BOOKING_STATUSES = ["held", "pending_payment", "paid"] as const;

export const registrationRepository = {
  activeStatuses: ACTIVE_BOOKING_STATUSES,

  async create(payload: Partial<RegistrationDocument>, session?: ClientSession) {
    const [doc] = await RegistrationModel.create([payload], { session });
    return doc.toObject();
  },

  async findById(registrationId: string | Types.ObjectId) {
    return RegistrationModel.findById(registrationId).lean<RegistrationDocument | null>();
  },

  async findByIdForUpdate(
    registrationId: string | Types.ObjectId,
    session: ClientSession,
  ) {
    return RegistrationModel.findById(registrationId).session(session);
  },

  async findByBookingReference(bookingReference: string) {
    return RegistrationModel.findOne({ bookingReference }).lean<RegistrationDocument | null>();
  },

  async findByStandIdWithActiveStatuses(
    standId: string | Types.ObjectId,
    session?: ClientSession,
  ) {
    return RegistrationModel.findOne({
      standId,
      registrationStatus: { $in: ACTIVE_BOOKING_STATUSES },
    })
      .session(session ?? null)
      .lean<RegistrationDocument | null>();
  },

  async findByStandSlotIdWithActiveStatuses(
    standSlotId: string | Types.ObjectId,
    session?: ClientSession,
  ) {
    return RegistrationModel.findOne({
      standSlotId,
      registrationStatus: { $in: ACTIVE_BOOKING_STATUSES },
    })
      .session(session ?? null)
      .lean<RegistrationDocument | null>();
  },

  async updateById(
    registrationId: string | Types.ObjectId,
    payload: Partial<RegistrationDocument>,
    session?: ClientSession,
  ) {
    return RegistrationModel.findByIdAndUpdate(registrationId, payload, {
      returnDocument: "after",
      session,
    }).lean<RegistrationDocument | null>();
  },

  async findExpiredActiveHolds(now: Date) {
    return RegistrationModel.find({
      registrationStatus: { $in: ["held", "pending_payment"] },
      holdExpiresAt: { $lt: now },
    }).lean<RegistrationDocument[]>();
  },

  async listByEvent(
    eventId: string,
    query: RegistrationFilterQuery,
  ): Promise<PaginatedResult<RegistrationDocument>> {
    const filter: Record<string, unknown> = { eventId };
    if (query.standType) filter.standType = query.standType;
    if (query.registrationStatus) filter.registrationStatus = query.registrationStatus;
    if (query.bookingReference) filter.bookingReference = new RegExp(query.bookingReference, "i");
    if (query.category) filter.categories = query.category;
    if (query.fromDate || query.toDate) {
      const createdAtFilter: Record<string, unknown> = {};
      if (query.fromDate) createdAtFilter.$gte = new Date(query.fromDate);
      if (query.toDate) createdAtFilter.$lte = new Date(query.toDate);
      filter.createdAt = createdAtFilter;
    }

    return paginateModel(RegistrationModel, filter, query.page, query.limit, {
      createdAt: -1,
    });
  },
};
