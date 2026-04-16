import type { NextConfig } from "next";

function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(/[\s,]+/g)
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function uniqueOrigins(origins: string[]): string[] {
  return Array.from(new Set(origins));
}

function buildAllowedDevOrigins(): string[] {
  const commonOrigins = [
    "localhost",
    "127.0.0.1",
    "admin.echosphere.systems",
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.trycloudflare.com",
    "*.loca.lt",
  ];

  return uniqueOrigins([
    ...commonOrigins,
    ...parseAllowedOrigins(process.env.NEXT_ALLOWED_DEV_ORIGINS),
  ]);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: buildAllowedDevOrigins(),
  experimental: {
    serverActions: {
      allowedOrigins: buildAllowedDevOrigins(),
    },
  },
  output: "standalone",
  reactCompiler: true,
};

export default nextConfig;
