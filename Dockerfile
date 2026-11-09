# syntax=docker/dockerfile:1
# Self-hosted frontend image for Living Historical Journeys (nateception-server).
# pnpm monorepo, multi-stage: install+build with full deps, ship only the Next
# standalone server. No build args or runtime secrets yet (accounts arrive later).
#
# Build context is the REPO ROOT (not apps/web) so the workspace packages
# @living-journeys/engine and @living-journeys/content are available to the build.

FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NEXT_TELEMETRY_DISABLED=1 CI=true
RUN corepack enable
# Workspace manifests first, for a cached install layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/engine/package.json packages/engine/
COPY content/package.json content/
RUN pnpm install --frozen-lockfile
# Source + build (standalone output traced from the monorepo root).
COPY . .
RUN pnpm --filter @living-journeys/web build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
# Standalone bundle mirrors the monorepo layout: apps/web/server.js + traced
# node_modules + workspace packages. Static assets sit under apps/web/.next.
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1
CMD ["node", "apps/web/server.js"]
