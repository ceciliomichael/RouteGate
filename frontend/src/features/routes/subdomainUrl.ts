export function getBaseDomainFromHostname(hostname: string): string {
  const normalizedHostname = hostname.trim().toLowerCase();
  if (!normalizedHostname) {
    return "";
  }

  const labels = normalizedHostname.split(".").filter(Boolean);
  if (labels.length <= 2) {
    return normalizedHostname;
  }

  return labels.slice(1).join(".");
}

export function buildSubdomainHref(
  subdomain: string,
  baseDomain: string,
  port = "",
): string | null {
  const normalizedSubdomain = subdomain.trim().toLowerCase();
  const normalizedBaseDomain = baseDomain.trim().toLowerCase();

  if (!normalizedSubdomain || !normalizedBaseDomain) {
    return null;
  }

  const portSuffix = port.trim().length > 0 ? `:${port.trim()}` : "";
  return `//${normalizedSubdomain}.${normalizedBaseDomain}${portSuffix}`;
}
