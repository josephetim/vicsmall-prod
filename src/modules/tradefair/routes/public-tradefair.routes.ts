import { Router } from "express";

import { publicTradefairController } from "@/modules/tradefair/controllers/public-tradefair.controller";

const publicTradefairRouter = Router();

publicTradefairRouter.get("/events/:slug", publicTradefairController.getEventBySlug);
publicTradefairRouter.get(
  "/events/:slug/layout",
  publicTradefairController.getEventLayout,
);
publicTradefairRouter.post(
  "/events/:slug/registrations/hold",
  publicTradefairController.createRegistrationHold,
);
publicTradefairRouter.get(
  "/registrations/:bookingReference/confirmation",
  publicTradefairController.getConfirmation,
);

export default publicTradefairRouter;
