import axios from "axios";
import mongoose from "mongoose";
import type { IncomingHttpHeaders } from "http";

import { badRequest, conflict, notFound, unauthorized } from "@/backend/utils/http-error";
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

const PAYABLE_STATUSES = new Set(["held", "pending_payment"]);

function buildFallbackEmail(vendorId: string) {
  return `no-reply+${vendorId}@vicsmall.com`;
}

function resolveCustomerEmail(email: string | undefined, vendorId: string) {
  const trimmed = email?.trim();
  if (trimmed && trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  return buildFallbackEmail(vendorId);
}

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
    if (registration.registrationStatus === "paid") {
      throw conflict("Registration has already been paid.");
    }
    if (!PAYABLE_STATUSES.has(registration.registrationStatus)) {
      throw conflict("Registration is not in payable state.");
    }
    if (
      registration.holdExpiresAt &&
      registration.holdExpiresAt.getTime() < Date.now()
    ) {
      throw conflict("Registration hold has expired. Please create a new hold.");
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
    const customerEmail = resolveCustomerEmail(vendor.email, String(vendor._id));

    console.info("[payments] initialize:start", {
      registrationId: String(registration._id),
      bookingReference: registration.bookingReference,
      amountKobo: registration.amountKobo,
      callbackUrl,
    });

    const response = await paystackClient.post(
      "/transaction/initialize",
      {
        email: customerEmail,
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
    if (response.data?.status === false) {
      throw conflict("Unable to initialize Paystack transaction.");
    }
    const gatewayReference = response.data?.data?.reference ?? reference;
    const authorizationUrl = response.data?.data?.authorization_url as string | undefined;
    const accessCode = response.data?.data?.access_code as string | undefined;
    if (!authorizationUrl) {
      throw conflict("Paystack did not return an authorization URL.");
    }

    console.info("[payments] initialize:response", {
      registrationId: String(registration._id),
      gatewayReference,
      hasAuthorizationUrl: Boolean(authorizationUrl),
      hasAccessCode: Boolean(accessCode),
    });

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
            gatewayAccessCode: accessCode,
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

    return {
      authorization_url: authorizationUrl,
      access_code: accessCode,
      reference: gatewayReference,
    };
  },

  async verifyPayment(reference: string): Promise<VerifyPaymentResponseDto> {
    if (!reference?.trim()) {
      throw badRequest("Payment reference is required.");
    }

    console.info("[payments] verify:start", { reference });

    const payment = await paymentRepository.findByReference(reference);
    if (!payment) throw notFound("Payment reference not found.");

    if (payment.paymentStatus === "success") {
      const registration = await registrationRepository.findById(payment.registrationId);
      console.info("[payments] verify:already-success", {
        reference,
        bookingReference: registration?.bookingReference,
      });
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
    if (response.data?.status === false) {
      throw conflict("Paystack verification failed.");
    }
    const verified = response.data?.data;
    if (!verified) {
      throw conflict("Unable to verify payment response.");
    }

    if (verified.status !== "success") {
      const normalizedStatus =
        verified.status === "abandoned" || verified.status === "failed"
          ? verified.status
          : "pending";

      await paymentRepository.updateById(
        payment._id,
        {
          paymentStatus: normalizedStatus,
          rawVerifyResponse: response.data,
        },
      );

      if (normalizedStatus === "failed" || normalizedStatus === "abandoned") {
        await registrationRepository.updateById(payment.registrationId, {
          registrationStatus: "failed",
        });
      }

      console.info("[payments] verify:non-success", {
        reference,
        paymentStatus: normalizedStatus,
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
          console.info("[payments] verify:already-success-in-tx", {
            reference,
            bookingReference: registration?.bookingReference,
          });
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

        console.info("[payments] verify:success", {
          reference,
          registrationId: String(registration._id),
          bookingReference: registration.bookingReference,
        });

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
    const redirectUrl = new URL(env.TRADEFAIR_CONFIRMATION_URL);

    if (!reference?.trim()) {
      console.warn("[payments] callback:missing-reference");
      redirectUrl.searchParams.set("status", "failed");
      return redirectUrl.toString();
    }

    console.info("[payments] callback:received", { reference });

    try {
      const result = await this.verifyPayment(reference);
      redirectUrl.searchParams.set("reference", reference);
      if (result.bookingReference) {
        redirectUrl.searchParams.set("bookingReference", result.bookingReference);
      }
      redirectUrl.searchParams.set("status", result.status);

      console.info("[payments] callback:redirect", {
        reference,
        status: result.status,
        hasBookingReference: Boolean(result.bookingReference),
      });
    } catch (error) {
      console.error("[payments] callback:verify-error", { reference, error });
      redirectUrl.searchParams.set("reference", reference);
      redirectUrl.searchParams.set("status", "failed");
    }

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
      console.info("[payments] webhook:charge-success", {
        reference: event.data.reference,
      });
      await this.verifyPayment(event.data.reference);
    }
  },
};
