import { z } from "zod";

export const createHoldSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().min(7),
  email: z.string().trim().email().optional(),
  brandName: z.string().trim().min(1),
  businessCategory: z.array(z.string().trim().min(1)).min(1),
  standPreferences: z.string().trim().max(500).optional(),
  standId: z.string().trim().min(1),
  standSlotId: z.string().trim().min(1).optional(),
  termsAccepted: z.literal(true),
});

export type CreateHoldInput = z.infer<typeof createHoldSchema>;
