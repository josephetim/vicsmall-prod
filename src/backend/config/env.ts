import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().optional(),
  BACKEND_PORT: z.coerce.number().default(4000),
  BACKEND_HOST: z.string().default("0.0.0.0"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB_NAME: z.string().default("vicsmall_tradefair"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  ADMIN_JWT_EXPIRES_IN: z.string().default("12h"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_USERNAME: z.string().trim().min(1).optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  PAYSTACK_SECRET_KEY: z.string().min(1, "PAYSTACK_SECRET_KEY is required"),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),

  TRADEFAIR_HOLD_MINUTES: z.coerce.number().default(20),
  TRADEFAIR_EVENT_SLUG: z.string().default("iuo-2026-tradefair"),
  TRADEFAIR_FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  TRADEFAIR_CONFIRMATION_URL: z
    .string()
    .url()
    .default("http://localhost:3000/tradefair/confirmation"),
  TRADEFAIR_CALLBACK_URL: z
    .string()
    .url()
    .default("http://localhost:4000/api/tradefair/payments/callback"),
  WHATSAPP_SUPPORT_NUMBER: z.string().default("2349049363602"),
});

export type BackendEnv = z.infer<typeof envSchema>;

let cachedEnv: BackendEnv | null = null;

export function getEnv(): BackendEnv {
  if (!cachedEnv) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid backend environment variables: ${JSON.stringify(
          parsed.error.flatten().fieldErrors,
        )}`,
      );
    }
    cachedEnv = parsed.data;
  }
  return cachedEnv;
}
