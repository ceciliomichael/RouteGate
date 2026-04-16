const FALLBACK_BACKEND_API_BASE = "http://localhost:3067";
const DOCKER_SERVICE_HOSTNAME = "backend";

function trimTrailingSlash(pathname: string): string {
  if (pathname === "/") {
    return "";
  }
  return pathname.replace(/\/+$/g, "");
}

function stripKnownApiSuffix(pathname: string): string {
  const normalized = trimTrailingSlash(pathname);
  if (normalized.endsWith("/api/routes")) {
    return normalized.slice(0, -"/api/routes".length);
  }
  if (normalized.endsWith("/api")) {
    return normalized.slice(0, -"/api".length);
  }
  return normalized;
}

export function getBackendApiBase(): string {
  return getBackendApiBaseCandidates()[0];
}

export function getBackendApiBaseCandidates(): string[] {
  const configured =
    process.env.BACKEND_API_BASE?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE?.trim() ||
    FALLBACK_BACKEND_API_BASE;
  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error("Invalid backend API base URL");
  }

  const normalizedPath = stripKnownApiSuffix(parsed.pathname);
  const primary = `${parsed.origin}${normalizedPath}`;
  const candidates = [primary];

  if (parsed.hostname === DOCKER_SERVICE_HOSTNAME) {
    const fallback = new URL(primary);
    fallback.hostname = "localhost";
    candidates.push(fallback.toString().replace(/\/+$/g, ""));
  }

  return Array.from(new Set(candidates));
}

export function buildBackendApiUrl(
  pathSegments: string[],
  search: string,
): string {
  return buildBackendApiUrlFromBase(getBackendApiBase(), pathSegments, search);
}

export function buildBackendApiUrlFromBase(
  base: string,
  pathSegments: string[],
  search: string,
): string {
  const suffix =
    pathSegments.length > 0
      ? `/${pathSegments.map((part) => encodeURIComponent(part)).join("/")}`
      : "";
  return `${base}/api${suffix}${search}`;
}

export function buildBackendRoutesUrl(
  pathSegments: string[],
  search: string,
): string {
  return buildBackendApiUrl(["routes", ...pathSegments], search);
}
