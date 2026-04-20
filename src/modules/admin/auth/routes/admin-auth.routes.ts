import { Router } from "express";

import { adminAuthMiddleware } from "@/backend/middleware/admin-auth";
import { adminAuthController } from "@/modules/admin/auth/controllers/admin-auth.controller";

const adminAuthRouter = Router();

adminAuthRouter.post("/login", adminAuthController.login);
adminAuthRouter.get("/me", adminAuthMiddleware, adminAuthController.me);
adminAuthRouter.post("/logout", adminAuthMiddleware, adminAuthController.logout);

export default adminAuthRouter;
