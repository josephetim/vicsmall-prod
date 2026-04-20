"use client";

import {
  ADMIN_AUTH_COOKIE,
  ADMIN_AUTH_TOKEN_TTL_SECONDS,
} from "@/modules/admin/auth/session";

const LOCAL_BACKEND_FALLBACK = "http://localhost:4000";
const ADMIN_TOKEN_STORAGE_KEY = "admin_token";

let didWarnMissingBaseUrl = false;

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getClientApiBaseUrl() {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBaseUrl) {
    return normalizeBaseUrl(envBaseUrl);
  }

  if (!didWarnMissingBaseUrl) {
    didWarnMissingBaseUrl = true;
    console.warn(
      "NEXT_PUBLIC_API_BASE_URL is not set. Falling back to http://localhost:4000.",
    );
  }

  return LOCAL_BACKEND_FALLBACK;
}

function getCookieSecureAttribute() {
  if (typeof window === "undefined") return "";
  return window.location.protocol === "https:" ? "; Secure" : "";
}

function readTokenFromStorage() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
}

export function persistAdminToken(token: string) {
  if (typeof window === "undefined") return;

  localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  document.cookie = `${ADMIN_AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${ADMIN_AUTH_TOKEN_TTL_SECONDS}; SameSite=Lax${getCookieSecureAttribute()}`;
}

export function clearAdminToken() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  document.cookie = `${ADMIN_AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${getCookieSecureAttribute()}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const token = readTokenFromStorage();

  const headers: HeadersInit = {
    ...(options.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (!("Content-Type" in (headers as Record<string, string>)) && options.body) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const response = await fetch(`${getClientApiBaseUrl()}${normalizedPath}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

