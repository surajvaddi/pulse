import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: new URL("../..", import.meta.url).pathname,
  reactStrictMode: true,
  transpilePackages: ["@pulseshift/domain"]
};

export default nextConfig;
