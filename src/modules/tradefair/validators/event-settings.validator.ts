import { z } from "zod";

const eventStatusValues = ["draft", "live", "closed", "archived"] as const;

const requiredDateSchema = z.preprocess(
  (value) => {
    if (value instanceof Date) return value;
    if (value === null || value === undefined || value === "") return value;
    return new Date(String(value));
  },
  z.date(),
);

const optionalDateSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") return undefined;
    if (value instanceof Date) return value;
    return new Date(String(value));
  },
  z.date().optional(),
);

const optionalTextSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

const optionalEmailSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  .pipe(z.string().email().optional());

export const eventSettingsUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Event title is required."),
    slug: z
      .string()
      .trim()
      .min(1, "Event slug is required.")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must contain lowercase letters, numbers, and hyphens only.",
      ),
    venue: z.string().trim().min(1, "Venue is required."),
    eventDate: requiredDateSchema,
    status: z.enum(eventStatusValues),
    registrationOpenAt: optionalDateSchema,
    registrationCloseAt: optionalDateSchema,
    supportContact: z.object({
      whatsapp: z.string().trim().min(7, "WhatsApp support number is required."),
      phone: optionalTextSchema,
      email: optionalEmailSchema,
    }),
    shortDescription: optionalTextSchema,
    bannerText: optionalTextSchema,
    registrationStatusText: optionalTextSchema,
    publicHelperText: optionalTextSchema,
    displayLabels: z
      .object({
        photoBoothLabel: optionalTextSchema,
        vicsmallStandLabel: optionalTextSchema,
        stageLabel: optionalTextSchema,
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.registrationOpenAt &&
      value.registrationCloseAt &&
      value.registrationOpenAt > value.registrationCloseAt
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Registration open date must be earlier than close date.",
        path: ["registrationOpenAt"],
      });
    }
  });

export type EventSettingsUpdateInput = z.infer<typeof eventSettingsUpdateSchema>;
