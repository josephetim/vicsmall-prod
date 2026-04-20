import { z } from "zod";

const addNoteAction = z.object({
  action: z.literal("add_note"),
  note: z.string().trim().min(1),
});

const cancelAction = z.object({
  action: z.literal("cancel_registration"),
  reason: z.string().trim().min(1).optional(),
});

const reassignStandAction = z.object({
  action: z.literal("reassign_stand"),
  standId: z.string().trim().min(1),
});

const reassignSlotAction = z.object({
  action: z.literal("reassign_slot"),
  standSlotId: z.string().trim().min(1),
});

const markRefundedAction = z.object({
  action: z.literal("mark_refunded"),
  reason: z.string().trim().min(1).optional(),
});

const manualStatusAction = z.object({
  action: z.literal("manual_status"),
  registrationStatus: z.enum([
    "draft",
    "held",
    "pending_payment",
    "paid",
    "failed",
    "expired",
    "cancelled",
    "refunded",
  ]),
});

const markPaidManualAction = z.object({
  action: z.literal("mark_paid_manual"),
  reference: z.string().trim().min(1).optional(),
});

const correctCategoryAction = z.object({
  action: z.literal("correct_category"),
  businessCategory: z.array(z.string().trim().min(1)).min(1),
});

export const adminUpdateRegistrationSchema = z.union([
  addNoteAction,
  cancelAction,
  reassignStandAction,
  reassignSlotAction,
  markRefundedAction,
  manualStatusAction,
  markPaidManualAction,
  correctCategoryAction,
]);

export type AdminUpdateRegistrationInput = z.infer<
  typeof adminUpdateRegistrationSchema
>;
