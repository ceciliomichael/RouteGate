export const NON_ADMIN_BLOCKED_DESTINATION_HOSTS = [
  "localhost",
  "127.0.0.1",
  "::1",
  "192.168.1.28",
] as const;

function normalizeDestinationInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.includes("://") ? trimmed : `http://${trimmed}`;
}

export function extractDestinationHost(value: string): string | null {
  try {
    const normalized = normalizeDestinationInput(value);
    if (!normalized) {
      return null;
    }

    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function getBlockedDestinationHost(value: string): string | null {
  const host = extractDestinationHost(value);
  if (!host) {
    return null;
  }

  const blockedHost = NON_ADMIN_BLOCKED_DESTINATION_HOSTS.find(
    (candidate) => candidate.toLowerCase() === host,
  );

  return blockedHost ?? null;
}
