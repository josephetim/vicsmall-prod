const LOCAL_BACKEND_DEFAULT = "http://localhost:4000";

function normalizeBaseUrl(value: string | undefined) {
  if (!value) return LOCAL_BACKEND_DEFAULT;
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL ??
      process.env.BACKEND_API_BASE_URL ??
      process.env.TRADEFAIR_API_BASE_URL,
  );
}

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
