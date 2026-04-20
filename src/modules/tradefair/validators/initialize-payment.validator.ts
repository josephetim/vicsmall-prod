import { z } from "zod";

export const initializePaymentParamsSchema = z.object({
  registrationId: z.string().trim().min(1),
});

export const verifyPaymentSchema = z.object({
  reference: z.string().trim().min(1),
});
