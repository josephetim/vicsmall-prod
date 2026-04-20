import type { Request, Response } from "express";

import { getEnv } from "@/backend/config/env";
import { sendSuccess } from "@/backend/utils/response";
import { ADMIN_AUTH_COOKIE, ADMIN_AUTH_TOKEN_TTL_SECONDS } from "@/modules/admin/auth/constants";
import { adminAuthService } from "@/modules/admin/auth/services/admin-auth.service";

function setAdminCookie(res: Response, token: string) {
  const env = getEnv();
  const isProduction = env.NODE_ENV === "production";
  res.cookie(ADMIN_AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: ADMIN_AUTH_TOKEN_TTL_SECONDS * 1000,
  });
}

function clearAdminCookie(res: Response) {
  const env = getEnv();
  const isProduction = env.NODE_ENV === "production";
  res.clearCookie(ADMIN_AUTH_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });
}

export const adminAuthController = {
  async login(req: Request, res: Response) {
    const data = await adminAuthService.login(req.body);
    setAdminCookie(res, data.token);
    return sendSuccess(
      res,
      {
        token: data.token,
        user: data.user,
      },
      200,
    );
  },

  async me(req: Request, res: Response) {
    return sendSuccess(res, {
      user: {
        id: req.adminContext?.userId,
        email: req.adminContext?.email,
        username: req.adminContext?.username,
        role: req.adminContext?.role,
      },
    });
  },

  async logout(_req: Request, res: Response) {
    clearAdminCookie(res);
    return sendSuccess(res, { success: true });
  },
};
