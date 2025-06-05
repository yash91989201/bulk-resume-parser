/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "@/env.js";
import type { NextConfig } from "next";

const nextConfig = {
  output: "standalone",
  experimental: {
    authInterrupts: true,
    allowDevelopmentBuild: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
} satisfies NextConfig;

export default nextConfig;
