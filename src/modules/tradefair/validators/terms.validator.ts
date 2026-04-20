import { z } from "zod";

export const createTermsSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

export const updateTermsSchema = z.object({
  title: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});
