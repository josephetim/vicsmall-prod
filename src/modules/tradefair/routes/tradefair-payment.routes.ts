import { Router } from "express";

import { tradefairPaymentController } from "@/modules/tradefair/controllers/tradefair-payment.controller";

const tradefairPaymentRouter = Router();

tradefairPaymentRouter.post(
  "/registrations/:registrationId/payments/initialize",
  tradefairPaymentController.initialize,
);
tradefairPaymentRouter.post("/payments/verify", tradefairPaymentController.verify);
tradefairPaymentRouter.get(
  "/payments/callback",
  tradefairPaymentController.callback,
);
tradefairPaymentRouter.post("/payments/webhook", tradefairPaymentController.webhook);

export default tradefairPaymentRouter;
