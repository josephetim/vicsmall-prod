import { Types } from "mongoose";

import { badRequest } from "@/backend/utils/http-error";

export function ensureObjectId(value: string, fieldName = "id") {
  if (!Types.ObjectId.isValid(value)) {
    throw badRequest(`Invalid ${fieldName} value.`);
  }
  return new Types.ObjectId(value);
}
