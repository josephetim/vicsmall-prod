import { paymentRepository } from "@/modules/tradefair/repositories/payment.repository";
import { tradefairPaymentService } from "@/modules/tradefair/services/tradefair-payment.service";

export async function reconcilePaymentsJob() {
  const candidates = await paymentRepository.listPendingOrAbandoned();
  let verified = 0;
  let failed = 0;

  for (const payment of candidates) {
    try {
      await tradefairPaymentService.verifyPayment(payment.gatewayReference);
      verified += 1;
    } catch (error) {
      failed += 1;
      // Best-effort reconciliation loop; do not terminate entire job batch.
      console.error(
        "[jobs:reconcile-payments] verify failed",
        payment.gatewayReference,
        error,
      );
    }
  }

  return {
    scanned: candidates.length,
    verified,
    failed,
  };
}
