import { z } from "zod";

export const createLayoutSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateLayoutSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const publishLayoutSchema = z.object({
  note: z.string().trim().optional(),
});

export const duplicateEventSchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  eventDate: z.coerce.date(),
});
