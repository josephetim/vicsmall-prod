const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

const STATIC_EXTENSION_REGEX =
  /\.(?:css|js|map|txt|xml|json|ico|svg|png|jpg|jpeg|gif|webp|avif|woff|woff2|ttf|otf)$/i;

const DEFAULT_EXEMPT_PREFIXES = [
  "/maintenance",
  "/admin",
  "/api/admin",
  "/health",
  "/api/health",
];

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

function normalizePrefix(prefix: string): string {
  const trimmed = prefix.trim();
  if (!trimmed) return "";
  if (trimmed === "/") return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizePrefixList(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const prefix = normalizePrefix(value);
    if (!prefix || seen.has(prefix)) continue;
    seen.add(prefix);
    normalized.push(prefix);
  }

  return normalized;
}

export function isMaintenanceModeEnabled(): boolean {
  return parseBoolean(process.env.MAINTENANCE_MODE);
}

export function getMaintenanceRetryAfterSeconds(): number {
  const parsed = Number(process.env.MAINTENANCE_RETRY_AFTER_SECONDS ?? "300");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 300;
  }
  return Math.floor(parsed);
}

export function getMaintenanceExemptPrefixes(): string[] {
  const configured = process.env.MAINTENANCE_EXEMPT_PATHS;
  if (!configured) {
    return DEFAULT_EXEMPT_PREFIXES;
  }

  const normalized = normalizePrefixList(configured.split(","));
  return normalized.length > 0 ? normalized : DEFAULT_EXEMPT_PREFIXES;
}

export function isMaintenanceExemptPath(pathname: string): boolean {
  const prefixes = getMaintenanceExemptPrefixes();
  return prefixes.some((prefix) => {
    if (prefix === "/") return true;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export function isInternalOrStaticPath(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest"
  ) {
    return true;
  }

  return STATIC_EXTENSION_REGEX.test(pathname);
}

