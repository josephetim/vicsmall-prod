import { NextResponse } from "next/server";

import { buildApiUrl } from "@/lib/api-base-url";
import { ADMIN_AUTH_COOKIE, ADMIN_AUTH_TOKEN_TTL_SECONDS } from "@/modules/admin/auth/session";

interface LoginRequestBody {
  username?: string;
  email?: string;
  identifier?: string;
  password?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginRequestBody | null;
  const identifier =
    body?.identifier?.trim() ?? body?.username?.trim() ?? body?.email?.trim() ?? "";
  const password = body?.password ?? "";

  if (!identifier || !password) {
    return NextResponse.json(
      { success: false, error: { message: "Identifier and password are required." } },
      { status: 400 },
    );
  }

  const response = await fetch(buildApiUrl("/api/admin/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        success?: boolean;
        data?: {
          token?: string;
          user?: Record<string, unknown>;
        };
        error?: { message?: string };
      }
    | null;

  if (!response.ok || !payload?.data?.token) {
    const message = payload?.error?.message ?? "Invalid username/email or password.";
    return NextResponse.json(
      { success: false, error: { message } },
      { status: response.status || 401 },
    );
  }

  const nextResponse = NextResponse.json({
    success: true,
    data: { user: payload.data.user },
  });

  nextResponse.cookies.set({
    name: ADMIN_AUTH_COOKIE,
    value: payload.data.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_AUTH_TOKEN_TTL_SECONDS,
  });

  return nextResponse;
}
