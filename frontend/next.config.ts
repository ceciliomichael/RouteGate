import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["admin.echosphere.systems"],
  output: "standalone",
  reactCompiler: true,
};

export default nextConfig;
