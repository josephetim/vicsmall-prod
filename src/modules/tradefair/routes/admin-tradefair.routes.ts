import { Router } from "express";

import { adminTradefairController } from "@/modules/tradefair/controllers/admin-tradefair.controller";

const adminTradefairRouter = Router();

adminTradefairRouter.get(
  "/events/:eventId/dashboard",
  adminTradefairController.getDashboard,
);
adminTradefairRouter.get(
  "/events/:eventId/registrations",
  adminTradefairController.getRegistrations,
);
adminTradefairRouter.get(
  "/registrations/:registrationId",
  adminTradefairController.getRegistrationDetail,
);
adminTradefairRouter.patch(
  "/registrations/:registrationId",
  adminTradefairController.updateRegistration,
);
adminTradefairRouter.get(
  "/events/:eventId/payments",
  adminTradefairController.getPayments,
);
adminTradefairRouter.get("/events/:eventId/stands", adminTradefairController.getStands);
adminTradefairRouter.get(
  "/events/:eventId/audit-logs",
  adminTradefairController.getAuditLogs,
);
adminTradefairRouter.patch("/stands/:standId", adminTradefairController.updateStand);
adminTradefairRouter.patch(
  "/stand-slots/:slotId",
  adminTradefairController.updateSlot,
);
adminTradefairRouter.patch("/slots/:slotId", adminTradefairController.updateSlot);

adminTradefairRouter.get(
  "/events/:eventId/export/registrations",
  adminTradefairController.exportRegistrations,
);
adminTradefairRouter.get(
  "/events/:eventId/export/payments",
  adminTradefairController.exportPayments,
);
adminTradefairRouter.get(
  "/events/:eventId/export/stands",
  adminTradefairController.exportStands,
);

adminTradefairRouter.get(
  "/events/:eventId/categories",
  adminTradefairController.listCategories,
);
adminTradefairRouter.patch(
  "/events/:eventId/categories/:categoryId",
  adminTradefairController.updateCategory,
);

adminTradefairRouter.get("/events/:eventId/terms", adminTradefairController.listTerms);
adminTradefairRouter.post(
  "/events/:eventId/terms",
  adminTradefairController.createTerms,
);
adminTradefairRouter.patch("/terms/:termsId", adminTradefairController.updateTerms);

adminTradefairRouter.get(
  "/events/:eventId/layouts",
  adminTradefairController.listLayouts,
);
adminTradefairRouter.post(
  "/events/:eventId/layouts",
  adminTradefairController.createLayout,
);
adminTradefairRouter.patch("/layouts/:layoutId", adminTradefairController.updateLayout);
adminTradefairRouter.post(
  "/layouts/:layoutId/publish",
  adminTradefairController.publishLayout,
);
adminTradefairRouter.post(
  "/events/:eventId/duplicate",
  adminTradefairController.duplicateEvent,
);

export default adminTradefairRouter;
