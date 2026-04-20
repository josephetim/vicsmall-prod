import { z } from "zod";

export const categoryUpdateSchema = z.object({
  isOpen: z.boolean().optional(),
  limit: z.number().int().nonnegative().nullable().optional(),
  priceOverrideKobo: z.number().int().positive().nullable().optional(),
  isArchived: z.boolean().optional(),
  name: z.string().trim().min(1).optional(),
});

export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
