import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The engine & content ship as TypeScript source (no build step); Next transpiles them.
  transpilePackages: ["@living-journeys/engine", "@living-journeys/content"],
  // Linting is run once, from the repo root, via the flat ESLint config.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
