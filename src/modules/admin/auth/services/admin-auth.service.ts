import bcrypt from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

import { getEnv } from "@/backend/config/env";
import { unauthorized } from "@/backend/utils/http-error";
import { adminUserRepository } from "@/modules/admin/auth/repositories/admin-user.repository";
import { adminLoginSchema } from "@/modules/admin/auth/validators/admin-auth.validator";
import type { TradefairAdminRole } from "@/modules/tradefair/types/backend.types";

interface AdminJwtPayload extends JwtPayload {
  sub: string;
  role: TradefairAdminRole;
  email: string;
  username: string;
  tokenType: "admin_access";
}

function signAdminToken(payload: Omit<AdminJwtPayload, "iat" | "exp">) {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.ADMIN_JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

function verifyAdminToken(token: string): AdminJwtPayload {
  const env = getEnv();
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (!decoded || typeof decoded === "string") {
    throw unauthorized("Invalid admin token.");
  }
  return decoded as AdminJwtPayload;
}

export const adminAuthService = {
  async login(payload: unknown) {
    const parsed = adminLoginSchema.parse(payload);
    const admin = await adminUserRepository.findByIdentifier(parsed.identifier);

    if (!admin || !admin.isActive) {
      throw unauthorized("Invalid admin credentials.");
    }

    const validPassword = await bcrypt.compare(parsed.password, admin.passwordHash);
    if (!validPassword) {
      throw unauthorized("Invalid admin credentials.");
    }

    await adminUserRepository.updateById(admin._id, { lastLoginAt: new Date() });

    const token = signAdminToken({
      sub: String(admin._id),
      role: admin.role,
      email: admin.email,
      username: admin.username,
      tokenType: "admin_access",
    });

    return {
      token,
      user: {
        id: String(admin._id),
        email: admin.email,
        username: admin.username,
        role: admin.role,
        isActive: admin.isActive,
        lastLoginAt: admin.lastLoginAt ?? null,
      },
    };
  },

  async getCurrentAdminFromToken(token: string) {
    const payload = verifyAdminToken(token);
    if (payload.tokenType !== "admin_access") {
      throw unauthorized("Invalid admin token.");
    }

    const admin = await adminUserRepository.findById(payload.sub);
    if (!admin || !admin.isActive) {
      throw unauthorized("Admin account is inactive or not found.");
    }

    return {
      id: String(admin._id),
      email: admin.email,
      username: admin.username,
      role: admin.role,
      isActive: admin.isActive,
      lastLoginAt: admin.lastLoginAt ?? null,
    };
  },
};
