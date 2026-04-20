import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildApiUrl } from "@/lib/api-base-url";
import { ADMIN_AUTH_COOKIE } from "@/modules/admin/auth/session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_AUTH_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, error: { message: "Unauthenticated." } },
      { status: 401 },
    );
  }

  const response = await fetch(buildApiUrl("/api/admin/auth/me"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const unauthorizedResponse = NextResponse.json(
      payload ?? { success: false, error: { message: "Unauthenticated." } },
      { status: response.status || 401 },
    );
    unauthorizedResponse.cookies.set({
      name: ADMIN_AUTH_COOKIE,
      value: "",
      maxAge: 0,
      path: "/",
    });
    return unauthorizedResponse;
  }

  return NextResponse.json(payload);
}
