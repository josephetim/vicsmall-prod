import { ADMIN_AUTH_COOKIE } from "@/modules/admin/auth/constants";

function parseCookieValue(cookieHeader: string, name: string) {
  const chunks = cookieHeader.split(";").map((chunk) => chunk.trim());
  for (const chunk of chunks) {
    if (!chunk) continue;
    const [rawKey, ...rawValue] = chunk.split("=");
    if (rawKey === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }
  return undefined;
}

export function extractAdminToken(input: {
  authorizationHeader?: string;
  cookieHeader?: string;
}) {
  const authHeader = input.authorizationHeader?.trim();
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const tokenFromHeader = authHeader.slice("bearer ".length).trim();
    if (tokenFromHeader) return tokenFromHeader;
  }

  if (input.cookieHeader) {
    return parseCookieValue(input.cookieHeader, ADMIN_AUTH_COOKIE);
  }

  return undefined;
}
