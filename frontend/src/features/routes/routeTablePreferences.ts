const ROUTE_OWNER_FILTER_STORAGE_PREFIX = "route-table-owner-filter";

export const ROUTE_OWNER_FILTER_ALL = "all";

export function getRouteOwnerFilterStorageKey(userId: string): string {
  return `${ROUTE_OWNER_FILTER_STORAGE_PREFIX}:${userId}`;
}

export function readPersistedRouteOwnerFilter(
  storageKey: string,
): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const value = raw?.trim() ?? "";
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writePersistedRouteOwnerFilter(
  storageKey: string,
  value: string,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    // Ignore persistence failures so filtering still works.
  }
}
