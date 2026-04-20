import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { buildApiUrl } from "@/lib/api-base-url";
import {
  ADMIN_AUTH_COOKIE,
  ADMIN_LOGIN_PATH,
  ADMIN_POST_LOGIN_PATH,
} from "@/modules/admin/auth/session";

async function isAuthenticated(request: NextRequest) {
  const token = request.cookies.get(ADMIN_AUTH_COOKIE)?.value;
  if (!token) return false;

  try {
    const response = await fetch(buildApiUrl("/api/admin/auth/me"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const authenticated = await isAuthenticated(request);

  if (pathname === ADMIN_LOGIN_PATH) {
    if (authenticated) {
      return NextResponse.redirect(new URL(ADMIN_POST_LOGIN_PATH, request.url));
    }
    return NextResponse.next();
  }

  if (!authenticated) {
    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set({
      name: ADMIN_AUTH_COOKIE,
      value: "",
      maxAge: 0,
      path: "/",
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
