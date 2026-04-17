import type { AuthUser } from "@/features/auth/types";

import { buildBackendApiUrl } from "./backendApiBase";

interface AuthResponseBody {
  user?: unknown;
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.username === "string" &&
    typeof candidate.email === "string" &&
    (candidate.role === "admin" || candidate.role === "user") &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

export async function resolveAuthenticatedUser(
  request: Request,
): Promise<AuthUser | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const response = await fetch(buildBackendApiUrl(["auth", "me"], ""), {
    cache: "no-store",
    headers: {
      cookie: cookieHeader,
    },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to verify terminal access (${response.status}).`);
  }

  const body = (await response.json()) as AuthResponseBody | null;
  if (!body || !isAuthUser(body.user)) {
    throw new Error("Invalid authentication response.");
  }

  return body.user;
}
