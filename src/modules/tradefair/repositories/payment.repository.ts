import type { ClientSession, Types } from "mongoose";

import { PaymentModel, type PaymentDocument } from "@/modules/tradefair/models/Payment";
import type { PaginatedResult, PaymentFilterQuery } from "@/modules/tradefair/types/backend.types";
import { paginateModel } from "@/modules/tradefair/repositories/repository.utils";

export const paymentRepository = {
  async create(payload: Partial<PaymentDocument>, session?: ClientSession) {
    const [doc] = await PaymentModel.create([payload], { session });
    return doc.toObject();
  },

  async findById(paymentId: string | Types.ObjectId) {
    return PaymentModel.findById(paymentId).lean<PaymentDocument | null>();
  },

  async findByReference(reference: string) {
    return PaymentModel.findOne({ gatewayReference: reference }).lean<PaymentDocument | null>();
  },

  async findByReferenceForUpdate(reference: string, session: ClientSession) {
    return PaymentModel.findOne({ gatewayReference: reference }).session(session);
  },

  async updateById(
    paymentId: string | Types.ObjectId,
    payload: Partial<PaymentDocument>,
    session?: ClientSession,
  ) {
    return PaymentModel.findByIdAndUpdate(paymentId, payload, {
      returnDocument: "after",
      session,
    }).lean<PaymentDocument | null>();
  },

  async listByEvent(
    eventId: string,
    query: PaymentFilterQuery,
  ): Promise<PaginatedResult<PaymentDocument>> {
    const filter: Record<string, unknown> = { eventId };
    if (query.status) filter.paymentStatus = query.status;
    if (query.reference) filter.gatewayReference = new RegExp(query.reference, "i");
    if (query.channel) filter.channel = new RegExp(query.channel, "i");
    if (query.fromDate || query.toDate) {
      const createdAtFilter: Record<string, unknown> = {};
      if (query.fromDate) createdAtFilter.$gte = new Date(query.fromDate);
      if (query.toDate) createdAtFilter.$lte = new Date(query.toDate);
      filter.createdAt = createdAtFilter;
    }
    return paginateModel(PaymentModel, filter, query.page, query.limit, {
      createdAt: -1,
    });
  },

  async listPendingOrAbandoned(eventId?: string) {
    const filter: Record<string, unknown> = {
      paymentStatus: { $in: ["initialized", "pending", "abandoned"] },
    };
    if (eventId) filter.eventId = eventId;
    return PaymentModel.find(filter).lean<PaymentDocument[]>();
  },
};
