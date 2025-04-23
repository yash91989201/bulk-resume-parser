/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "@/env.js";
// TYPES
import type { NextConfig } from "next";

const nextConfig = {
  output: "standalone",
  experimental: {
    authInterrupts: true,
    reactCompiler: true,
  },
} satisfies NextConfig;

export default nextConfig;
