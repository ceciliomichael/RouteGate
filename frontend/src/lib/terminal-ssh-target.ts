import crypto from "node:crypto";
import net from "node:net";

export interface TerminalSshTarget {
  username: string;
  host: string;
  port: number | null;
  password: string | null;
}

export interface TerminalSshTargetPublic {
  username: string;
  host: string;
  port: number | null;
}

export interface TerminalSshTargetInput {
  username: string;
  hostOrUrl: string;
  port?: number | null;
  password?: string | null;
}

const terminalSshTargets = new Map<string, TerminalSshTarget>();
const TERMINAL_TARGET_COOKIE_VERSION = 1;
export const TERMINAL_SSH_TARGET_COOKIE_NAME = "wc_terminal_target";
export const TERMINAL_SSH_TARGET_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function parsePort(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error("Port must be an integer between 1 and 65535.");
  }

  return value;
}

function normalizeHostFromInput(rawHost: string): {
  host: string;
  port: number | null;
} {
  const trimmedHost = rawHost.trim();
  if (trimmedHost.length === 0) {
    throw new Error("Host is required.");
  }

  if (trimmedHost.includes("://")) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedHost);
    } catch {
      throw new Error("Host/link is not a valid URL.");
    }

    if (!parsedUrl.hostname || parsedUrl.hostname.trim().length === 0) {
      throw new Error("Host/link does not include a valid hostname.");
    }

    return {
      host: parsedUrl.hostname.trim(),
      port: parsedUrl.port ? parsePort(Number(parsedUrl.port)) : null,
    };
  }

  if (trimmedHost.includes("/") || trimmedHost.includes("@")) {
    throw new Error("Host must be a plain hostname/IP or URL.");
  }

  return { host: trimmedHost, port: null };
}

function normalizeHost(host: string): string {
  const trimmed = host.trim();
  if (trimmed.length === 0) {
    throw new Error("Host is required.");
  }

  const bracketless =
    trimmed.startsWith("[") && trimmed.endsWith("]")
      ? trimmed.slice(1, -1)
      : trimmed;
  const ipVersion = net.isIP(bracketless);
  if (ipVersion === 4 || ipVersion === 6) {
    return bracketless;
  }

  if (bracketless.toLowerCase() === "localhost") {
    return "localhost";
  }

  const isValidHostname =
    /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)*[a-zA-Z0-9-]{1,63}$/.test(
      bracketless,
    );
  if (!isValidHostname) {
    throw new Error("Host must be a valid hostname or IP address.");
  }

  return bracketless.toLowerCase();
}

function normalizeUsername(rawUsername: string): string {
  const username = rawUsername.trim();
  if (username.length === 0) {
    throw new Error("Username is required.");
  }

  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(username)) {
    throw new Error(
      "Username must be 1-64 chars and use only letters, numbers, dot, underscore, or dash.",
    );
  }

  return username;
}

function normalizePassword(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const password = value.trim();
  if (password.length === 0) {
    return null;
  }

  if (password.length > 256) {
    throw new Error("Password is too long.");
  }

  return password;
}

export function getTerminalSshTarget(userId: string): TerminalSshTarget | null {
  return terminalSshTargets.get(userId) ?? null;
}

export function getTerminalSshTargetPublic(
  userId: string,
): TerminalSshTargetPublic | null {
  const target = getTerminalSshTarget(userId);
  if (!target) {
    return null;
  }

  return {
    username: target.username,
    host: target.host,
    port: target.port,
  };
}

export function requireTerminalSshTarget(userId: string): TerminalSshTarget {
  const target = getTerminalSshTarget(userId);
  if (!target) {
    throw new Error(
      "SSH target is not configured. Connect with username and host before opening terminals.",
    );
  }

  return target;
}

export function setTerminalSshTarget(
  userId: string,
  input: TerminalSshTargetInput,
): TerminalSshTarget {
  const username = normalizeUsername(input.username);
  const parsedHost = normalizeHostFromInput(input.hostOrUrl);
  const normalizedHost = normalizeHost(parsedHost.host);
  const inputPort = parsePort(input.port);
  const password = normalizePassword(input.password);
  const port = inputPort ?? parsedHost.port ?? null;

  const target: TerminalSshTarget = {
    username,
    host: normalizedHost,
    port,
    password,
  };

  terminalSshTargets.set(userId, target);
  return target;
}

export function clearTerminalSshTarget(userId: string): void {
  terminalSshTargets.delete(userId);
}

function toKeyMaterial(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

function resolveCookieSecret(): Buffer {
  const configuredSecret =
    process.env.TERMINAL_TARGET_SECRET ?? process.env.AUTH_SECRET;
  if (configuredSecret && configuredSecret.trim().length > 0) {
    return toKeyMaterial(configuredSecret.trim());
  }

  return toKeyMaterial("terminal-target-dev-secret");
}

function encodeEnvelope(envelope: {
  iv: string;
  tag: string;
  data: string;
}): string {
  return Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url");
}

function decodeEnvelope(value: string): {
  iv: string;
  tag: string;
  data: string;
} | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<{
      iv: unknown;
      tag: unknown;
      data: unknown;
    }>;
    if (
      typeof parsed.iv !== "string" ||
      typeof parsed.tag !== "string" ||
      typeof parsed.data !== "string"
    ) {
      return null;
    }

    return {
      iv: parsed.iv,
      tag: parsed.tag,
      data: parsed.data,
    };
  } catch {
    return null;
  }
}

interface TerminalTargetCookiePayload {
  v: number;
  userId: string;
  savedAt: number;
  target: TerminalSshTarget;
}

export function createTerminalSshTargetCookieValue(
  userId: string,
  target: TerminalSshTarget,
): string {
  const payload: TerminalTargetCookiePayload = {
    v: TERMINAL_TARGET_COOKIE_VERSION,
    userId,
    savedAt: Date.now(),
    target,
  };

  const iv = crypto.randomBytes(12);
  const key = resolveCookieSecret();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return encodeEnvelope({
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    data: encrypted.toString("base64url"),
  });
}

export function restoreTerminalSshTargetFromCookie(
  userId: string,
  cookieValue: string | undefined,
): TerminalSshTarget | null {
  if (!cookieValue || cookieValue.trim().length === 0) {
    return null;
  }

  const envelope = decodeEnvelope(cookieValue);
  if (!envelope) {
    return null;
  }

  try {
    const key = resolveCookieSecret();
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(envelope.iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));

    const payloadJson = Buffer.concat([
      decipher.update(Buffer.from(envelope.data, "base64url")),
      decipher.final(),
    ]).toString("utf8");

    const payload = JSON.parse(
      payloadJson,
    ) as Partial<TerminalTargetCookiePayload>;
    if (
      payload.v !== TERMINAL_TARGET_COOKIE_VERSION ||
      payload.userId !== userId ||
      !payload.target
    ) {
      return null;
    }

    const normalized = setTerminalSshTarget(userId, {
      username: payload.target.username,
      hostOrUrl: payload.target.host,
      port: payload.target.port,
      password: payload.target.password,
    });

    return normalized;
  } catch {
    return null;
  }
}
