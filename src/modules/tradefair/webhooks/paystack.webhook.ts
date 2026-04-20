import type { IncomingHttpHeaders } from "http";

import { tradefairPaymentService } from "@/modules/tradefair/services/tradefair-payment.service";

export async function handlePaystackWebhook(
  headers: IncomingHttpHeaders,
  rawBody: string,
  payload: unknown,
) {
  await tradefairPaymentService.handleWebhook(headers, rawBody, payload);
}
