import type { NextFunction, Request, Response } from "express";

import { unauthorized } from "@/backend/utils/http-error";
import { adminAuthService } from "@/modules/admin/auth/services/admin-auth.service";
import { extractAdminToken } from "@/modules/admin/auth/utils/token";

export async function adminAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = extractAdminToken({
      authorizationHeader: req.headers.authorization,
      cookieHeader: req.headers.cookie,
    });

    if (!token) {
      return next(unauthorized("Missing admin authentication token."));
    }

    const admin = await adminAuthService.getCurrentAdminFromToken(token);

    req.adminContext = {
      userId: admin.id,
      role: admin.role,
      email: admin.email,
      username: admin.username,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}
