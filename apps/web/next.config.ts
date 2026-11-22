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
  poweredByHeader: false,
  // Nothing here uses next/image; without this the optimizer endpoint would still
  // accept requests, and it has been the subject of several security advisories.
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
