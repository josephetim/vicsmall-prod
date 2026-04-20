import axios from "axios";
import mongoose from "mongoose";
import type { IncomingHttpHeaders } from "http";

import { conflict, notFound, unauthorized } from "@/backend/utils/http-error";
import { getEnv } from "@/backend/config/env";
import type { InitializePaymentResponseDto, VerifyPaymentResponseDto } from "@/modules/tradefair/dto/initialize-payment.dto";
import { auditLogRepository } from "@/modules/tradefair/repositories/audit-log.repository";
import { paymentRepository } from "@/modules/tradefair/repositories/payment.repository";
import { registrationRepository } from "@/modules/tradefair/repositories/registration.repository";
import { standSlotRepository } from "@/modules/tradefair/repositories/stand-slot.repository";
import { isValidPaystackSignature } from "@/modules/tradefair/utils/paystack-signature";
import { tradefairEventRepository } from "@/modules/tradefair/repositories/tradefair-event.repository";
import { vendorRepository } from "@/modules/tradefair/repositories/vendor.repository";

const paystackClient = axios.create({
  baseURL: "https://api.paystack.co",
});

function getPaystackHeaders() {
  const env = getEnv();
  return {
    Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

export const tradefairPaymentService = {
  async initializePayment(registrationId: string): Promise<InitializePaymentResponseDto> {
    const registration = await registrationRepository.findById(registrationId);
    if (!registration) throw notFound("Registration not found.");
    if (registration.registrationStatus !== "held") {
      throw conflict("Registration is not in payable state.");
    }

    const [vendor, event] = await Promise.all([
      vendorRepository.findById(registration.vendorId),
      tradefairEventRepository.findById(registration.eventId),
    ]);
    if (!vendor || !event) {
      throw notFound("Registration payment dependencies not found.");
    }

    const reference = `VIC-${Date.now()}-${String(registration._id).slice(-6).toUpperCase()}`;
    const callbackUrl = getEnv().TRADEFAIR_CALLBACK_URL;

    const response = await paystackClient.post(
      "/transaction/initialize",
      {
        email: vendor.email || `noemail+${String(vendor._id)}@vicsmall.local`,
        amount: registration.amountKobo,
        reference,
        callback_url: callbackUrl,
        metadata: {
          registrationId: String(registration._id),
          bookingReference: registration.bookingReference,
          vendorName: `${vendor.firstName} ${vendor.lastName}`,
          brandName: vendor.brandName,
        },
      },
      { headers: getPaystackHeaders() },
    );
    const gatewayReference = response.data?.data?.reference ?? reference;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await paymentRepository.create(
          {
            eventId: registration.eventId,
            registrationId: registration._id,
            vendorId: vendor._id,
            gateway: "paystack",
            gatewayReference,
            gatewayAccessCode: response.data?.data?.access_code,
            amountKobo: registration.amountKobo,
            currency: registration.currency,
            paymentStatus: "initialized",
            rawInitializeResponse: response.data,
          },
          session,
        );

        await registrationRepository.updateById(
          registration._id,
          {
            registrationStatus: "pending_payment",
          },
          session,
        );
      });
    } finally {
      session.endSession();
    }

    return response.data?.data as InitializePaymentResponseDto;
  },

  async verifyPayment(reference: string): Promise<VerifyPaymentResponseDto> {
    const payment = await paymentRepository.findByReference(reference);
    if (!payment) throw notFound("Payment reference not found.");

    if (payment.paymentStatus === "success") {
      const registration = await registrationRepository.findById(payment.registrationId);
      return {
        ok: true,
        status: "success",
        bookingReference: registration?.bookingReference,
        alreadyVerified: true,
      };
    }

    const response = await paystackClient.get(`/transaction/verify/${reference}`, {
      headers: getPaystackHeaders(),
    });
    const verified = response.data?.data;
    if (!verified) {
      throw conflict("Unable to verify payment response.");
    }

    if (verified.status !== "success") {
      const normalizedStatus =
        verified.status === "abandoned" || verified.status === "failed"
          ? verified.status
          : "pending";
      await paymentRepository.updateById(payment._id, {
        paymentStatus: normalizedStatus,
        rawVerifyResponse: response.data,
      });
      return { ok: false, status: normalizedStatus };
    }

    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(async () => {
        const paymentForUpdate = await paymentRepository.findByReferenceForUpdate(
          reference,
          session,
        );
        if (!paymentForUpdate) throw notFound("Payment reference not found.");

        if (paymentForUpdate.paymentStatus === "success") {
          const registration = await registrationRepository.findById(
            paymentForUpdate.registrationId,
          );
          return {
            ok: true,
            status: "success",
            bookingReference: registration?.bookingReference,
            alreadyVerified: true,
          };
        }

        const registration = await registrationRepository.findByIdForUpdate(
          paymentForUpdate.registrationId,
          session,
        );
        if (!registration) throw notFound("Registration not found.");
        if (
          ["cancelled", "refunded"].includes(registration.registrationStatus)
        ) {
          throw conflict("Registration cannot be paid in its current state.");
        }

        await paymentRepository.updateById(
          paymentForUpdate._id,
          {
            paymentStatus: "success",
            channel: verified.channel ?? null,
            paidAt: verified.paid_at ? new Date(verified.paid_at) : new Date(),
            rawVerifyResponse: response.data,
          },
          session,
        );

        await registrationRepository.updateById(
          registration._id,
          {
            registrationStatus: "paid",
            paidAt: verified.paid_at ? new Date(verified.paid_at) : new Date(),
          },
          session,
        );

        if (registration.standSlotId) {
          await standSlotRepository.updateById(
            registration.standSlotId,
            {
              status: "paid",
              heldUntil: undefined,
            },
            session,
          );
        }

        await auditLogRepository.create(
          {
            eventId: String(registration.eventId),
            actorType: "system",
            action: "payment_verified",
            entityType: "payment",
            entityId: String(paymentForUpdate._id),
            metadata: {
              reference,
              registrationId: String(registration._id),
              bookingReference: registration.bookingReference,
            },
          },
          session,
        );

        return {
          ok: true,
          status: "success",
          bookingReference: registration.bookingReference,
          alreadyVerified: false,
        };
      });
    } finally {
      session.endSession();
    }
  },

  async handleCallback(reference: string) {
    const env = getEnv();
    const result = await this.verifyPayment(reference);
    const redirectUrl = new URL(env.TRADEFAIR_CONFIRMATION_URL);
    redirectUrl.searchParams.set("reference", reference);
    if (result.bookingReference) {
      redirectUrl.searchParams.set("bookingReference", result.bookingReference);
    }
    redirectUrl.searchParams.set("status", result.status);
    return redirectUrl.toString();
  },

  async handleWebhook(headers: IncomingHttpHeaders, rawBody: string, body: unknown) {
    const env = getEnv();
    const signature =
      (headers["x-paystack-signature"] as string | undefined) ??
      (headers["X-Paystack-Signature"] as string | undefined);
    const secret = env.PAYSTACK_WEBHOOK_SECRET || env.PAYSTACK_SECRET_KEY;
    if (
      !isValidPaystackSignature({
        rawBody,
        signature,
        secret,
      })
    ) {
      throw unauthorized("Invalid Paystack webhook signature.");
    }

    const event = body as { event?: string; data?: { reference?: string } };
    if (event.event === "charge.success" && event.data?.reference) {
      await this.verifyPayment(event.data.reference);
    }
  },
};
