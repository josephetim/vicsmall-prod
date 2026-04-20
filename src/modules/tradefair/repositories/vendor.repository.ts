import type { ClientSession, Types } from "mongoose";

import { VendorModel, type VendorDocument } from "@/modules/tradefair/models/Vendor";

export const vendorRepository = {
  async create(payload: Partial<VendorDocument>, session?: ClientSession) {
    const [doc] = await VendorModel.create([payload], { session });
    return doc.toObject();
  },

  async findById(vendorId: string | Types.ObjectId) {
    return VendorModel.findById(vendorId).lean<VendorDocument | null>();
  },

  async findByPhoneAndBrand(phone: string, brandName: string) {
    return VendorModel.findOne({ phone, brandName }).lean<VendorDocument | null>();
  },

  async findOrCreateByPhoneAndBrand(
    payload: Partial<VendorDocument> & { phone: string; brandName: string },
    session?: ClientSession,
  ) {
    const existing = await VendorModel.findOne({
      phone: payload.phone,
      brandName: payload.brandName,
    }).session(session ?? null);

    if (existing) {
      existing.firstName = payload.firstName ?? existing.firstName;
      existing.lastName = payload.lastName ?? existing.lastName;
      existing.email = payload.email ?? existing.email;
      existing.businessCategory = payload.businessCategory ?? existing.businessCategory;
      existing.standPreferences = payload.standPreferences ?? existing.standPreferences;
      await existing.save({ session });
      return existing.toObject();
    }

    const [created] = await VendorModel.create([payload], { session });
    return created.toObject();
  },
};
