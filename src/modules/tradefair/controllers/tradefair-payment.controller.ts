import type { Request, Response } from "express";

import { sendSuccess } from "@/backend/utils/response";
import { initializePaymentParamsSchema, verifyPaymentSchema } from "@/modules/tradefair/validators/initialize-payment.validator";
import { tradefairPaymentService } from "@/modules/tradefair/services/tradefair-payment.service";
import { handlePaystackWebhook } from "@/modules/tradefair/webhooks/paystack.webhook";

function getParam(req: Request, key: string) {
  const value = req.params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getQueryString(req: Request, key: string) {
  const value = req.query[key];
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : "";
  }
  if (value === undefined) return "";
  return String(value);
}

export const tradefairPaymentController = {
  async initialize(req: Request, res: Response) {
    const params = initializePaymentParamsSchema.parse({
      registrationId: getParam(req, "registrationId"),
    });
    const data = await tradefairPaymentService.initializePayment(params.registrationId);
    return sendSuccess(res, data, 201);
  },

  async verify(req: Request, res: Response) {
    const body = verifyPaymentSchema.parse(req.body);
    const data = await tradefairPaymentService.verifyPayment(body.reference);
    return sendSuccess(res, data);
  },

  async callback(req: Request, res: Response) {
    const reference = getQueryString(req, "reference");
    const redirectUrl = await tradefairPaymentService.handleCallback(reference);
    return res.redirect(302, redirectUrl);
  },

  async webhook(req: Request, res: Response) {
    await handlePaystackWebhook(req.headers, req.rawBody ?? "", req.body);
    return sendSuccess(res, { acknowledged: true });
  },
};
