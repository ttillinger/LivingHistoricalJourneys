import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Self-hosted Docker image ships the Next standalone server (see /Dockerfile).
  // Trace from the monorepo root so the workspace packages are bundled in.
  // Skipped on Windows: the standalone copy needs symlinks, which fail there (EPERM).
  output: process.platform === "win32" ? undefined : "standalone",
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  // The engine & content ship as TypeScript source (no build step); Next transpiles them.
  transpilePackages: ["@living-journeys/engine", "@living-journeys/content"],
  // Linting is run once, from the repo root, via the flat ESLint config.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
