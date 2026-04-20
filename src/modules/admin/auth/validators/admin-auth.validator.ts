import { z } from "zod";

export const adminLoginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});
