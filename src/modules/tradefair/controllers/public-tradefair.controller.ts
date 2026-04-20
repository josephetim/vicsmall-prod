import type { Request, Response } from "express";

import { sendSuccess } from "@/backend/utils/response";
import { tradefairEventService } from "@/modules/tradefair/services/tradefair-event.service";
import { tradefairLayoutService } from "@/modules/tradefair/services/tradefair-layout.service";
import { tradefairRegistrationService } from "@/modules/tradefair/services/tradefair-registration.service";

function getParam(req: Request, key: string) {
  const value = req.params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export const publicTradefairController = {
  async getEventBySlug(req: Request, res: Response) {
    const data = await tradefairEventService.getSummaryBySlug(getParam(req, "slug"));
    return sendSuccess(res, data);
  },

  async getEventLayout(req: Request, res: Response) {
    const data = await tradefairLayoutService.getLayoutBySlug(getParam(req, "slug"));
    return sendSuccess(res, data);
  },

  async createRegistrationHold(req: Request, res: Response) {
    const data = await tradefairRegistrationService.createHold(
      getParam(req, "slug"),
      req.body,
    );
    return sendSuccess(res, data, 201);
  },

  async getConfirmation(req: Request, res: Response) {
    const data = await tradefairRegistrationService.getConfirmation(
      getParam(req, "bookingReference"),
    );
    return sendSuccess(res, data);
  },
};
