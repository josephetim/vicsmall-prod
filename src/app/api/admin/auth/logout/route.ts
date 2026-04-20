import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildApiUrl } from "@/lib/api-base-url";
import { ADMIN_AUTH_COOKIE } from "@/modules/admin/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_AUTH_COOKIE)?.value;

  if (token) {
    await fetch(buildApiUrl("/api/admin/auth/logout"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }).catch(() => null);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: ADMIN_AUTH_COOKIE,
    value: "",
    maxAge: 0,
    path: "/",
  });
  return response;
}
