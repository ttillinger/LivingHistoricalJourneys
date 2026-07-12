import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The engine ships as TypeScript source (no build step); let Next transpile it.
  transpilePackages: ["@living-journeys/engine"],
  // Linting is run once, from the repo root, via the flat ESLint config.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
