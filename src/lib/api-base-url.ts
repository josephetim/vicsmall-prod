const LOCAL_BACKEND_DEFAULT = "http://localhost:4000";
let didWarnMissingApiBaseUrl = false;

function normalizeBaseUrl(value: string | undefined) {
  if (!value) return LOCAL_BACKEND_DEFAULT;
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!configuredBaseUrl && !didWarnMissingApiBaseUrl) {
    didWarnMissingApiBaseUrl = true;
    console.warn(
      "NEXT_PUBLIC_API_BASE_URL is not set. Falling back to http://localhost:4000.",
    );
  }

  return normalizeBaseUrl(configuredBaseUrl);
}

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
